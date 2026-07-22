import "server-only";

import { prisma } from "@/infrastructure/db/prisma.server";
import { formatAdminDateTime } from "@/features/admin/domain/format";
import type { AdminToolInvocationLogItem, AdminToolListItem, AdminToolPermissionItem, AdminToolRuntimeConfigItem } from "@/features/admin/domain/types";
import { ensureModelCatalog } from "@/features/ai/server/models/model-catalog.server";

/** 工具列表 DTO：隐藏版本 Schema、凭证和请求模板等敏感或复杂字段。 */
export async function getAdminToolList(take = 50): Promise<AdminToolListItem[]> {
  const tools = await prisma.tool.findMany({
    orderBy: { updatedAt: "desc" },
    take,
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
      isEnabled: true,
      updatedAt: true,
      _count: { select: { versions: true, models: true } },
    },
  });

  return tools.map((tool) => ({
    id: tool.id,
    key: tool.key,
    name: tool.name,
    description: tool.description ?? "暂无描述",
    enabled: tool.isEnabled,
    versions: tool._count.versions,
    modelBindings: tool._count.models,
    updatedAt: formatAdminDateTime(tool.updatedAt),
  }));
}

/** 工具权限概览：第一版以模型绑定关系表达工具可用范围。 */
export async function getAdminToolPermissionOverview(): Promise<AdminToolPermissionItem[]> {
  const tools = await prisma.tool.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      key: true,
      name: true,
      models: { select: { isEnabled: true } },
      versions: { orderBy: { version: "desc" }, take: 1, select: { status: true } },
    },
  });

  return tools.map((tool) => ({
    id: tool.id,
    toolName: tool.name,
    toolKey: tool.key,
    enabledModels: tool.models.filter((model) => model.isEnabled).length,
    disabledModels: tool.models.filter((model) => !model.isEnabled).length,
    latestVersionStatus: tool.versions[0]?.status ?? "暂无版本",
  }));
}

/** 工具调用日志 DTO：用于排查调用状态、耗时和错误摘要。 */
export async function getAdminToolInvocationLogs(): Promise<AdminToolInvocationLogItem[]> {
  const logs = await prisma.toolInvocation.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      callId: true,
      status: true,
      durationMs: true,
      createdAt: true,
      errorMessage: true,
      toolVersion: { select: { tool: { select: { name: true } } } },
    },
  });

  return logs.map((log) => ({
    id: log.id,
    toolName: log.toolVersion.tool.name,
    callId: log.callId,
    status: log.status,
    durationMs: log.durationMs === null ? "-" : `${log.durationMs}ms`,
    createdAt: formatAdminDateTime(log.createdAt),
    errorMessage: log.errorMessage ?? "-",
  }));
}

/** MCP / Function 配置骨架：当前数据库以 HTTP ToolVersion 存储可执行配置。 */
export async function getAdminToolRuntimeConfigs(): Promise<AdminToolRuntimeConfigItem[]> {
  const versions = await prisma.toolVersion.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      version: true,
      status: true,
      method: true,
      endpointTemplate: true,
      timeoutMs: true,
      maxResponseBytes: true,
      tool: { select: { name: true } },
    },
  });

  return versions.map((version) => ({
    id: version.id,
    toolName: version.tool.name,
    version: version.version,
    method: version.method,
    endpoint: version.endpointTemplate,
    timeoutMs: version.timeoutMs,
    maxResponseBytes: version.maxResponseBytes,
    status: version.status,
  }));
}

/** 工具配置表单所需的非敏感选项与版本状态。 */
export async function getAdminToolEditorData() {
  await ensureModelCatalog();
  const [tools, models, versions] = await Promise.all([
    prisma.tool.findMany({ orderBy: { name: "asc" }, select: { id: true, key: true, name: true, isEnabled: true } }),
    prisma.model.findMany({ orderBy: [{ provider: { name: "asc" } }, { name: "asc" }], select: { id: true, key: true, name: true } }),
    prisma.toolVersion.findMany({ orderBy: [{ tool: { name: "asc" } }, { version: "desc" }], take: 100, select: { id: true, toolId: true, version: true, status: true, exampleInput: true, tool: { select: { name: true } }, credentials: { select: { alias: true } } } }),
  ]);
  return { tools, models, versions: versions.map((item) => ({ ...item, exampleInput: item.exampleInput as unknown, credentialAliases: item.credentials.map((credential) => credential.alias) })) };
}
