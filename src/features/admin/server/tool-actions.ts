"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/infrastructure/db/prisma.server";
import { getAdminViewer } from "@/features/admin/server/auth.server";
import { encryptCredential, decryptCredential } from "@/infrastructure/security/credentials.server";
import { executeHttpTool } from "@/features/ai/server/tools/http-tool-executor.server";
import { assertJsonSchemaValue } from "@/features/ai/server/tools/json-schema.server";
import { toolVersionInputSchema, type RuntimeHttpToolConfig } from "@/features/ai/server/tools/dynamic-tool-types";
import { ensureModelCatalog } from "@/features/ai/server/models/model-catalog.server";

const STATIC_TOOL_NAMES = new Set(["webSearch", "imageRecognition", "textStatistics"]);

async function admin() {
  const viewer = await getAdminViewer();
  if (!viewer?.isAdmin) throw new Error("ADMIN_REQUIRED");
  return viewer;
}

function text(formData: FormData, key: string) { return String(formData.get(key) ?? "").trim(); }
function json(formData: FormData, key: string, fallback: unknown) { const raw = text(formData, key); return raw ? JSON.parse(raw) as unknown : fallback; }
function refreshTools() { revalidatePath("/admin/tools/list"); revalidatePath("/admin/tools/mcp-functions"); revalidatePath("/admin/tools/permissions"); revalidatePath("/admin/tools/logs"); }

export async function createToolAction(formData: FormData) {
  const viewer = await admin();
  const input = z.object({ key: z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{1,119}$/), name: z.string().min(1).max(120), description: z.string().max(1000) }).parse({ key: text(formData, "key"), name: text(formData, "name"), description: text(formData, "description") });
  if (STATIC_TOOL_NAMES.has(input.key)) throw new Error("工具 key 与内置工具冲突。");
  const tool = await prisma.tool.create({ data: { ...input, createdById: viewer.id } });
  await prisma.auditLog.create({ data: { actorId: viewer.id, action: "tool.create", resourceType: "Tool", resourceId: tool.id, summary: { key: tool.key } } });
  refreshTools();
}

export async function toggleToolAction(toolId: string) {
  const viewer = await admin();
  const current = await prisma.tool.findUniqueOrThrow({ where: { id: toolId }, select: { isEnabled: true } });
  await prisma.tool.update({ where: { id: toolId }, data: { isEnabled: !current.isEnabled } });
  await prisma.auditLog.create({ data: { actorId: viewer.id, action: "tool.toggle", resourceType: "Tool", resourceId: toolId, summary: { enabled: !current.isEnabled } } });
  refreshTools();
}

export async function createToolVersionAction(formData: FormData) {
  const viewer = await admin();
  const toolId = z.string().uuid().parse(text(formData, "toolId"));
  const draftVersionId = text(formData, "draftVersionId");
  const input = toolVersionInputSchema.parse({
    method: text(formData, "method"), endpointTemplate: text(formData, "endpointTemplate"),
    requestTemplate: json(formData, "requestTemplate", { pathParams: {}, query: {}, headers: {} }),
    inputSchema: json(formData, "inputSchema", {}), outputSchema: json(formData, "outputSchema", null),
    exampleInput: json(formData, "exampleInput", {}), responsePath: text(formData, "responsePath") || null,
    timeoutMs: Number(text(formData, "timeoutMs") || 15000), maxResponseBytes: Number(text(formData, "maxResponseBytes") || 1048576),
  });
  assertJsonSchemaValue(input.inputSchema, input.exampleInput, "EXAMPLE_INPUT_INVALID");
  const credentialAlias = text(formData, "credentialAlias");
  const credentialValue = text(formData, "credentialValue");
  await prisma.$transaction(async (tx) => {
    const data = { method: input.method, endpointTemplate: input.endpointTemplate, requestTemplate: input.requestTemplate as never, inputSchema: input.inputSchema as never, outputSchema: input.outputSchema as never, exampleInput: input.exampleInput as never, responsePath: input.responsePath, timeoutMs: input.timeoutMs, maxResponseBytes: input.maxResponseBytes };
    let version;
    if (draftVersionId) {
      const draft = await tx.toolVersion.findFirst({ where: { id: draftVersionId, toolId, status: "DRAFT" } });
      if (!draft) throw new Error("只能编辑所选工具的草稿版本。");
      version = await tx.toolVersion.update({ where: { id: draft.id }, data });
    } else {
      const latest = await tx.toolVersion.aggregate({ where: { toolId }, _max: { version: true } });
      version = await tx.toolVersion.create({ data: { toolId, version: (latest._max.version ?? 0) + 1, ...data, createdById: viewer.id } });
    }
    if (credentialAlias || credentialValue) {
      if (!credentialAlias || !credentialValue) throw new Error("凭据别名和值必须同时填写。");
      const credential = await tx.platformCredential.create({ data: { key: `tool_${randomUUID()}`, purpose: "HTTP_TOOL", encryptedPayload: Uint8Array.from(encryptCredential(credentialValue)) } });
      await tx.toolCredential.deleteMany({ where: { toolVersionId: version.id, alias: credentialAlias } });
      await tx.toolCredential.create({ data: { toolVersionId: version.id, credentialId: credential.id, alias: credentialAlias } });
    }
    await tx.auditLog.create({ data: { actorId: viewer.id, action: "tool.version.create", resourceType: "ToolVersion", resourceId: version.id, summary: { toolId, version: version.version } } });
  });
  refreshTools();
}

export async function cloneToolVersionAction(versionId: string) {
  const viewer = await admin();
  await prisma.$transaction(async (tx) => {
    const source = await tx.toolVersion.findUniqueOrThrow({ where: { id: versionId }, include: { credentials: true } });
    const latest = await tx.toolVersion.aggregate({ where: { toolId: source.toolId }, _max: { version: true } });
    const copy = await tx.toolVersion.create({ data: { toolId: source.toolId, version: (latest._max.version ?? 0) + 1, method: source.method, endpointTemplate: source.endpointTemplate, requestTemplate: source.requestTemplate as never, inputSchema: source.inputSchema as never, outputSchema: source.outputSchema as never, exampleInput: source.exampleInput as never, responsePath: source.responsePath, timeoutMs: source.timeoutMs, maxResponseBytes: source.maxResponseBytes, createdById: viewer.id } });
    if (source.credentials.length) await tx.toolCredential.createMany({ data: source.credentials.map((item) => ({ toolVersionId: copy.id, credentialId: item.credentialId, alias: item.alias })) });
    await tx.auditLog.create({ data: { actorId: viewer.id, action: "tool.version.clone", resourceType: "ToolVersion", resourceId: copy.id, summary: { sourceVersionId: versionId } } });
  });
  refreshTools();
}

export async function archiveToolVersionAction(versionId: string) {
  const viewer = await admin();
  await prisma.$transaction([
    prisma.toolVersion.update({ where: { id: versionId }, data: { status: "ARCHIVED" } }),
    prisma.auditLog.create({ data: { actorId: viewer.id, action: "tool.version.archive", resourceType: "ToolVersion", resourceId: versionId } }),
  ]);
  refreshTools();
}

export async function publishToolVersionAction(versionId: string) {
  const viewer = await admin();
  const version = await prisma.toolVersion.findUniqueOrThrow({ where: { id: versionId }, include: { tool: true } });
  if (version.status !== "DRAFT") throw new Error("只有草稿版本可以发布。");
  if (STATIC_TOOL_NAMES.has(version.tool.key)) throw new Error("工具 key 与内置工具冲突。");
  const url = new URL(version.endpointTemplate.replace(/\{\{[^}]+\}\}/g, "placeholder").replace(/\{[^}]+\}/g, "placeholder"));
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("工具端点必须是无内嵌凭据的 HTTPS URL。");
  if (process.env.NODE_ENV === "production") {
    const hosts = (process.env.TOOL_ALLOWED_HOSTS ?? "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
    if (!hosts.some((host) => url.hostname === host || (host.startsWith("*.") && url.hostname.endsWith(host.slice(1))))) throw new Error("生产环境工具域名未加入允许列表。");
  }
  await prisma.$transaction([
    prisma.toolVersion.updateMany({ where: { toolId: version.toolId, status: "PUBLISHED" }, data: { status: "ARCHIVED" } }),
    prisma.toolVersion.update({ where: { id: versionId }, data: { status: "PUBLISHED", publishedAt: new Date() } }),
    prisma.auditLog.create({ data: { actorId: viewer.id, action: "tool.version.publish", resourceType: "ToolVersion", resourceId: versionId, summary: { toolKey: version.tool.key, version: version.version } } }),
  ]);
  refreshTools();
}

async function runtimeConfig(versionId: string): Promise<RuntimeHttpToolConfig> {
  const version = await prisma.toolVersion.findUniqueOrThrow({ where: { id: versionId }, include: { tool: true, credentials: { include: { credential: true } } } });
  const parsed = toolVersionInputSchema.parse(version);
  return { ...parsed, toolId: version.toolId, toolVersionId: version.id, key: version.tool.key, name: version.tool.name, description: version.tool.description ?? version.tool.name, version: version.version, credentials: version.credentials.map((item) => ({ alias: item.alias, value: decryptCredential(item.credential.encryptedPayload) })) };
}

export async function testToolVersionAction(versionId: string) {
  const viewer = await admin();
  const config = await runtimeConfig(versionId);
  await executeHttpTool(config, config.exampleInput, { context: "TEST", callId: randomUUID(), actorId: viewer.id });
  refreshTools();
}

export async function bindModelToolAction(formData: FormData) {
  const viewer = await admin();
  await ensureModelCatalog();
  const input = z.object({ modelId: z.string().uuid(), toolId: z.string().uuid() }).parse({ modelId: text(formData, "modelId"), toolId: text(formData, "toolId") });
  const existing = await prisma.modelTool.findUnique({ where: { modelId_toolId: input } });
  await prisma.modelTool.upsert({ where: { modelId_toolId: input }, update: { isEnabled: !existing?.isEnabled }, create: { ...input, isEnabled: true } });
  await prisma.auditLog.create({ data: { actorId: viewer.id, action: "tool.model.bind", resourceType: "ModelTool", resourceId: `${input.modelId}:${input.toolId}`, summary: { enabled: !existing?.isEnabled } } });
  refreshTools();
}
