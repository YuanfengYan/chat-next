import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request as httpsRequest } from "node:https";
import { prisma } from "@/infrastructure/db/prisma.server";
import { assertJsonSchemaValue } from "@/features/ai/server/tools/json-schema.server";
import { requestTemplateSchema, type RuntimeHttpToolConfig, type ToolExecutionContext } from "@/features/ai/server/tools/dynamic-tool-types";

const SENSITIVE_KEY = /authorization|cookie|api[-_]?key|token|secret|password|credential/i;
const PLACEHOLDER = /\{\{(input|credential)\.([A-Za-z0-9_.-]+)\}\}/g;

function getPath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => current && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined, value);
}

function renderString(template: string, input: unknown, credentials: Map<string, string>) {
  return template.replace(PLACEHOLDER, (_match, source: string, path: string) => {
    const value = source === "input" ? getPath(input, path) : credentials.get(path);
    if (value === undefined || value === null || typeof value === "object") throw new Error(`TOOL_TEMPLATE_VALUE_MISSING:${source}.${path}`);
    return String(value);
  });
}

function renderValue(value: unknown, input: unknown, credentials: Map<string, string>): unknown {
  if (typeof value === "string") return renderString(value, input, credentials);
  if (Array.isArray(value)) return value.map((item) => renderValue(item, input, credentials));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, renderValue(item, input, credentials)]));
  return value;
}

function isForbiddenAddress(address: string) {
  if (!isIP(address)) return true;
  const normalized = address.toLowerCase();
  if (normalized === "::1" || normalized === "::" || normalized.startsWith("fe80:") || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("ff")) return true;
  const ipv4 = normalized.startsWith("::ffff:") ? normalized.slice(7) : normalized;
  const parts = ipv4.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19));
}

function allowedHost(hostname: string) {
  const configured = (process.env.TOOL_ALLOWED_HOSTS ?? "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  if (process.env.NODE_ENV !== "production" && process.env.TOOL_ALLOW_LOCALHOST === "true" && (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1")) return true;
  return configured.some((allowed) => hostname === allowed || (allowed.startsWith("*.") && hostname.endsWith(allowed.slice(1))));
}

async function resolveSafeAddress(hostname: string) {
  if (!allowedHost(hostname)) throw new Error("TOOL_HOST_NOT_ALLOWED");
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  const localDevelopment = process.env.NODE_ENV !== "production" && process.env.TOOL_ALLOW_LOCALHOST === "true" && (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1");
  if (!addresses.length || (!localDevelopment && addresses.some((item) => isForbiddenAddress(item.address)))) throw new Error("TOOL_ADDRESS_NOT_ALLOWED");
  return addresses[0];
}

interface HttpResult { status: number; headers: Record<string, string>; body: unknown; bytes: number }

async function requestJson(url: URL, method: string, headers: Record<string, string>, body: string | undefined, maxBytes: number, signal: AbortSignal, redirects = 0): Promise<HttpResult> {
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("TOOL_URL_NOT_ALLOWED");
  const resolved = await resolveSafeAddress(url.hostname);
  return new Promise<HttpResult>((resolve, reject) => {
    const request = httpsRequest(url, {
      method,
      headers,
      signal,
      lookup: (_hostname, _options, callback) => callback(null, resolved.address, resolved.family),
    }, (response) => {
      const status = response.statusCode ?? 0;
      if (status >= 300 && status < 400 && response.headers.location) {
        response.resume();
        if (redirects >= 3) return reject(new Error("TOOL_TOO_MANY_REDIRECTS"));
        requestJson(new URL(response.headers.location, url), method, headers, body, maxBytes, signal, redirects + 1).then(resolve, reject);
        return;
      }
      const chunks: Buffer[] = [];
      let bytes = 0;
      response.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > maxBytes) response.destroy(new Error("TOOL_RESPONSE_TOO_LARGE"));
        else chunks.push(chunk);
      });
      response.on("error", reject);
      response.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        let parsed: unknown;
        try { parsed = text ? JSON.parse(text) : null; } catch { return reject(new Error("TOOL_RESPONSE_NOT_JSON")); }
        const normalizedHeaders = Object.fromEntries(Object.entries(response.headers).flatMap(([key, value]) => value === undefined ? [] : [[key, Array.isArray(value) ? value.join(",") : value]]));
        if (status < 200 || status >= 300) return reject(new Error(`TOOL_HTTP_ERROR:${status}`));
        resolve({ status, headers: normalizedHeaders, body: parsed, bytes });
      });
    });
    request.on("error", reject);
    if (body !== undefined) request.write(body);
    request.end();
  });
}

function summarize(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[已截断]";
  if (typeof value === "string") return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => summarize(item, depth + 1));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).slice(0, 50).map(([key, item]) => [key, SENSITIVE_KEY.test(key) ? "[已脱敏]" : summarize(item, depth + 1)]));
  return value;
}

function selectResponse(value: unknown, path?: string | null) {
  if (!path) return value;
  const selected = getPath(value, path);
  if (selected === undefined) throw new Error("TOOL_RESPONSE_PATH_NOT_FOUND");
  return selected;
}

/** 渲染并执行数据库声明的 HTTP Tool，同时写入脱敏调用审计。 */
export async function executeHttpTool(config: RuntimeHttpToolConfig, input: unknown, context: ToolExecutionContext) {
  const startedAt = new Date();
  const invocation = await prisma.toolInvocation.create({
    data: {
      generationId: context.generationId,
      actorId: context.actorId,
      context: context.context,
      sessionExternalId: context.sessionExternalId,
      toolVersionId: config.toolVersionId,
      callId: context.callId,
      status: "RUNNING",
      input: summarize(input) as never,
      startedAt,
    },
  });
  try {
    assertJsonSchemaValue(config.inputSchema, input, "TOOL_INPUT_INVALID");
    const template = requestTemplateSchema.parse(config.requestTemplate);
    const credentials = new Map(config.credentials.map((item) => [item.alias, item.value]));
    const pathParams = renderValue(template.pathParams, input, credentials) as Record<string, unknown>;
    let endpoint = renderString(config.endpointTemplate, input, credentials);
    for (const [key, value] of Object.entries(pathParams)) endpoint = endpoint.replaceAll(`{${key}}`, encodeURIComponent(String(value)));
    const url = new URL(endpoint);
    const query = renderValue(template.query, input, credentials) as Record<string, unknown>;
    for (const [key, value] of Object.entries(query)) {
      if (Array.isArray(value)) value.forEach((item) => url.searchParams.append(key, String(item)));
      else if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
    const renderedHeaders = renderValue(template.headers, input, credentials) as Record<string, unknown>;
    const headers: Record<string, string> = { accept: "application/json" };
    for (const [key, value] of Object.entries(renderedHeaders)) {
      if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(key) || /[\r\n]/.test(String(value))) throw new Error("TOOL_HEADER_INVALID");
      headers[key] = String(value);
    }
    const renderedBody = template.body === undefined ? undefined : renderValue(template.body, input, credentials);
    const body = renderedBody === undefined ? undefined : JSON.stringify(renderedBody);
    if (body !== undefined) headers["content-type"] ??= "application/json";
    const timeout = AbortSignal.timeout(config.timeoutMs);
    const signal = context.abortSignal ? AbortSignal.any([context.abortSignal, timeout]) : timeout;
    const response = await requestJson(url, config.method, headers, body, config.maxResponseBytes, signal);
    const output = selectResponse(response.body, config.responsePath);
    if (config.outputSchema) assertJsonSchemaValue(config.outputSchema, output, "TOOL_OUTPUT_INVALID");
    await prisma.toolInvocation.update({ where: { id: invocation.id }, data: { status: "SUCCEEDED", output: summarize({ status: response.status, bytes: response.bytes, value: output }) as never, durationMs: Date.now() - startedAt.getTime(), finishedAt: new Date() } });
    return output;
  } catch (error) {
    const aborted = context.abortSignal?.aborted;
    const code = error instanceof Error ? error.message.split(":", 1)[0] : "TOOL_EXECUTION_FAILED";
    await prisma.toolInvocation.update({ where: { id: invocation.id }, data: { status: aborted ? "CANCELLED" : "FAILED", errorCode: code.slice(0, 100), errorMessage: "远程工具调用失败。", durationMs: Date.now() - startedAt.getTime(), finishedAt: new Date() } });
    throw new Error(`${code}:远程工具调用失败`);
  }
}
