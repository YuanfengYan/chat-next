import "server-only";
import { dynamicTool, jsonSchema, type ToolExecutionOptions, type ToolSet } from "ai";
import { prisma } from "@/lib/db/prisma.server";
import { decryptCredential } from "@/lib/security/credentials.server";
import { executeHttpTool } from "@/lib/ai/tools/http-tool-executor.server";
import { validateJsonSchemaValue } from "@/lib/ai/tools/json-schema.server";
import { toolVersionInputSchema, type RuntimeHttpToolConfig } from "@/lib/ai/tools/dynamic-tool-types";

export interface DynamicToolLoadContext {
  modelId: string;
  generationId: string;
  actorId: string;
  sessionExternalId: string;
  abortSignal?: AbortSignal;
}

/** 从数据库装载单次生成所需的已发布 HTTP 工具快照。 */
export async function loadDynamicTools(context: DynamicToolLoadContext): Promise<{ tools: ToolSet; snapshot: Array<{ key: string; version: number; toolVersionId: string }> }> {
  const bindings = await prisma.modelTool.findMany({
    where: { isEnabled: true, model: { key: context.modelId, isEnabled: true }, tool: { isEnabled: true } },
    select: {
      tool: {
        select: {
          id: true, key: true, name: true, description: true,
          versions: {
            where: { status: "PUBLISHED" }, orderBy: { version: "desc" }, take: 1,
            select: {
              id: true, version: true, method: true, endpointTemplate: true, requestTemplate: true,
              inputSchema: true, outputSchema: true, exampleInput: true, responsePath: true,
              timeoutMs: true, maxResponseBytes: true,
              credentials: { select: { alias: true, credential: { select: { encryptedPayload: true } } } },
            },
          },
        },
      },
    },
  });
  const tools: ToolSet = {};
  const snapshot: Array<{ key: string; version: number; toolVersionId: string }> = [];
  for (const binding of bindings) {
    const version = binding.tool.versions[0];
    if (!version) continue;
    const parsed = toolVersionInputSchema.parse({ ...version, requestTemplate: version.requestTemplate, inputSchema: version.inputSchema, outputSchema: version.outputSchema, exampleInput: version.exampleInput });
    const config: RuntimeHttpToolConfig = {
      ...parsed,
      toolId: binding.tool.id,
      toolVersionId: version.id,
      key: binding.tool.key,
      name: binding.tool.name,
      description: binding.tool.description ?? binding.tool.name,
      version: version.version,
      credentials: version.credentials.map((item) => ({ alias: item.alias, value: decryptCredential(item.credential.encryptedPayload) })),
    };
    const schema = config.inputSchema;
    tools[config.key] = dynamicTool({
      description: config.description,
      inputSchema: jsonSchema(schema as never, { validate: (value) => {
        const errors = validateJsonSchemaValue(schema, value);
        return errors.length ? { success: false, error: new Error(errors.join("；")) } : { success: true, value };
      } }),
      execute: (input: unknown, options: ToolExecutionOptions<unknown>) => executeHttpTool(config, input, {
        context: "CHAT",
        callId: options.toolCallId,
        generationId: context.generationId,
        actorId: context.actorId,
        sessionExternalId: context.sessionExternalId,
        abortSignal: options.abortSignal ?? context.abortSignal,
      }),
    });
    snapshot.push({ key: config.key, version: config.version, toolVersionId: config.toolVersionId });
  }
  return { tools, snapshot };
}
