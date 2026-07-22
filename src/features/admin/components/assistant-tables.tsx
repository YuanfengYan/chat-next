import type { ReactNode } from "react";
import { AdminEmptyState, AdminPageHeader, AdminSection, StatusPill } from "@/features/admin/components/admin-page";
import type { AdminAssistantListItem, AdminKnowledgeBindingItem, AdminModelParameterItem, AdminPromptConfigItem, AdminToolBindingItem } from "@/features/admin/domain/types";

export function AssistantListTable({ assistants }: { assistants: AdminAssistantListItem[] }) {
  return (
    <div>
      <AdminPageHeader title="助手列表" description="当前以 PromptTemplate 作为助手稳定身份，后续可扩展独立助手模型。" />
      <AdminSection title="助手目录" description="展示助手 key、描述和 Prompt 版本数量。">
        <SimpleTable emptyText="还没有助手数据" rows={assistants} headers={["助手", "描述", "版本", "更新"]} render={(assistant) => [
          <span key="name"><span className="block font-medium">{assistant.name}</span><span className="mt-1 block text-xs text-muted-foreground">{assistant.key}</span></span>,
          assistant.description,
          assistant.versions,
          <span key="updated" className="text-muted-foreground">{assistant.updatedAt}</span>,
        ]} />
      </AdminSection>
    </div>
  );
}

export function PromptConfigTable({ prompts }: { prompts: AdminPromptConfigItem[] }) {
  return (
    <div>
      <AdminPageHeader title="Prompt 配置" description="查看 Prompt 版本、发布状态和变量规模。" />
      <AdminSection title="Prompt 版本" description="第一版只读展示，发布和回滚操作后续接入。">
        <SimpleTable emptyText="还没有 Prompt 配置" rows={prompts} headers={["助手", "版本", "状态", "变量数", "创建时间"]} render={(prompt) => [
          prompt.assistantName,
          prompt.version,
          prompt.status,
          prompt.variables,
          <span key="time" className="text-muted-foreground">{prompt.createdAt}</span>,
        ]} />
      </AdminSection>
    </div>
  );
}

export function ModelParameterTable({ models }: { models: AdminModelParameterItem[] }) {
  return (
    <div>
      <AdminPageHeader title="模型参数" description="查看模型目录中的上下文、输出上限和工具绑定规模。" />
      <AdminSection title="模型目录" description="默认参数编辑能力后续接入模型管理模块。">
        <SimpleTable emptyText="还没有模型数据" rows={models} headers={["模型", "状态", "上下文", "输出上限", "工具绑定"]} render={(model) => [
          <span key="model"><span className="block font-medium">{model.modelName}</span><span className="mt-1 block text-xs text-muted-foreground">{model.provider}</span></span>,
          <StatusPill key="status" active={model.enabled} />,
          model.contextWindow,
          model.maxOutputTokens,
          model.toolBindings,
        ]} />
      </AdminSection>
    </div>
  );
}

export function ToolBindingTable({ bindings }: { bindings: AdminToolBindingItem[] }) {
  return (
    <div>
      <AdminPageHeader title="工具绑定" description="查看模型和工具之间的可用关系。" />
      <AdminSection title="绑定关系" description="后续助手级绑定可在独立 Assistant 模型落地后接入。">
        <SimpleTable emptyText="还没有工具绑定数据" rows={bindings} headers={["模型", "工具", "状态"]} render={(binding) => [
          binding.modelName,
          binding.toolName,
          <StatusPill key="status" active={binding.enabled} />,
        ]} />
      </AdminSection>
    </div>
  );
}

export function KnowledgeBindingTable({ bindings }: { bindings: AdminKnowledgeBindingItem[] }) {
  return (
    <div>
      <AdminPageHeader title="知识库绑定" description="知识库模型尚未落地，先保留后台入口和服务层 DTO。" />
      <AdminSection title="绑定关系" description="后续接入 RAG 和知识库后在这里展示助手与知识库的绑定。">
        <SimpleTable emptyText="知识库绑定能力建设中" rows={bindings} headers={["助手", "知识库", "状态"]} render={(binding) => [
          binding.assistantName,
          binding.knowledgeBase,
          binding.status,
        ]} />
      </AdminSection>
    </div>
  );
}

function SimpleTable<T extends { id: string }>({ headers, rows, emptyText, render }: { headers: string[]; rows: T[]; emptyText: string; render: (row: T) => ReactNode[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-muted/45 text-left text-xs text-muted-foreground">
          <tr>{headers.map((header) => <th key={header} className="px-4 py-3 font-medium">{header}</th>)}</tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => <tr key={row.id}>{render(row).map((cell, index) => <td key={index} className="px-4 py-3">{cell}</td>)}</tr>)}
        </tbody>
      </table>
      {!rows.length && <AdminEmptyState text={emptyText} />}
    </div>
  );
}
