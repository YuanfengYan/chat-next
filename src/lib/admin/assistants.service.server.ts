import "server-only";

import { prisma } from "@/lib/db/prisma.server";
import { countJsonObjectKeys, formatAdminDateTime } from "@/lib/admin/format";
import type { AdminAssistantListItem, AdminKnowledgeBindingItem, AdminModelParameterItem, AdminPromptConfigItem, AdminToolBindingItem } from "@/lib/admin/types";

/** 助手列表骨架：当前以 PromptTemplate 作为稳定助手身份的承载。 */
export async function getAdminAssistantList(): Promise<AdminAssistantListItem[]> {
  const templates = await prisma.promptTemplate.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
      updatedAt: true,
      _count: { select: { versions: true } },
    },
  });

  return templates.map((template) => ({
    id: template.id,
    key: template.key,
    name: template.name,
    description: template.description ?? "暂无描述",
    versions: template._count.versions,
    updatedAt: formatAdminDateTime(template.updatedAt),
  }));
}

/** Prompt 配置列表：展示模板版本、发布状态和变量规模。 */
export async function getAdminPromptConfigs(): Promise<AdminPromptConfigItem[]> {
  const versions = await prisma.promptVersion.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      version: true,
      status: true,
      variables: true,
      createdAt: true,
      template: { select: { name: true } },
    },
  });

  return versions.map((version) => ({
    id: version.id,
    assistantName: version.template.name,
    version: version.version,
    status: version.status,
    variables: countJsonObjectKeys(version.variables),
    createdAt: formatAdminDateTime(version.createdAt),
  }));
}

/** 模型参数列表：展示模型目录中的上下文、输出和工具绑定规模。 */
export async function getAdminModelParameterConfigs(): Promise<AdminModelParameterItem[]> {
  const models = await prisma.model.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    take: 50,
    select: {
      id: true,
      name: true,
      contextWindow: true,
      maxOutputTokens: true,
      isEnabled: true,
      provider: { select: { name: true } },
      _count: { select: { tools: true } },
    },
  });

  return models.map((model) => ({
    id: model.id,
    provider: model.provider.name,
    modelName: model.name,
    contextWindow: model.contextWindow ? String(model.contextWindow) : "-",
    maxOutputTokens: model.maxOutputTokens ? String(model.maxOutputTokens) : "-",
    toolBindings: model._count.tools,
    enabled: model.isEnabled,
  }));
}

/** 工具绑定列表：展示模型与工具的可用关系。 */
export async function getAdminToolBindings(): Promise<AdminToolBindingItem[]> {
  const bindings = await prisma.modelTool.findMany({
    orderBy: [{ model: { name: "asc" } }, { tool: { name: "asc" } }],
    take: 50,
    select: {
      modelId: true,
      toolId: true,
      isEnabled: true,
      model: { select: { name: true } },
      tool: { select: { name: true } },
    },
  });

  return bindings.map((binding) => ({
    id: `${binding.modelId}:${binding.toolId}`,
    modelName: binding.model.name,
    toolName: binding.tool.name,
    enabled: binding.isEnabled,
  }));
}

/** 知识库绑定目前尚无数据库模型，先返回空 DTO，页面展示建设中状态。 */
export async function getAdminKnowledgeBindings(): Promise<AdminKnowledgeBindingItem[]> {
  return [];
}
