import type { ReactNode } from "react";
import { AdminEmptyState, AdminPageHeader, AdminSection, StatusPill } from "@/features/admin/components/admin-page";
import type { AdminToolInvocationLogItem, AdminToolListItem, AdminToolPermissionItem, AdminToolRuntimeConfigItem } from "@/features/admin/domain/types";

export function ToolListTable({ tools }: { tools: AdminToolListItem[] }) {
  return (
    <div>
      <AdminPageHeader title="工具列表" description="管理平台声明式工具目录、版本数量和模型绑定规模。" />
      <AdminSection title="工具目录" description="第一版先提供只读列表，后续再接入创建、发布和停用操作。">
        <SimpleTable emptyText="还没有工具数据" rows={tools} headers={["工具", "状态", "版本", "模型绑定", "更新"]} render={(tool) => [
          <span key="tool"><span className="block font-medium">{tool.name}</span><span className="mt-1 block text-xs text-muted-foreground">{tool.key} · {tool.description}</span></span>,
          <StatusPill key="status" active={tool.enabled} />,
          tool.versions,
          tool.modelBindings,
          <span key="updated" className="text-muted-foreground">{tool.updatedAt}</span>,
        ]} />
      </AdminSection>
    </div>
  );
}

export function ToolPermissionTable({ permissions }: { permissions: AdminToolPermissionItem[] }) {
  return (
    <div>
      <AdminPageHeader title="工具权限" description="以模型绑定关系展示工具可用范围，后续可扩展为角色和用户级权限。" />
      <AdminSection title="权限概览" description="启用模型越多，工具可被调用的模型范围越大。">
        <SimpleTable emptyText="还没有工具权限数据" rows={permissions} headers={["工具", "启用模型", "停用模型", "最新版本"]} render={(item) => [
          <span key="tool"><span className="block font-medium">{item.toolName}</span><span className="mt-1 block text-xs text-muted-foreground">{item.toolKey}</span></span>,
          item.enabledModels,
          item.disabledModels,
          item.latestVersionStatus,
        ]} />
      </AdminSection>
    </div>
  );
}

export function ToolInvocationLogTable({ logs }: { logs: AdminToolInvocationLogItem[] }) {
  return (
    <div>
      <AdminPageHeader title="工具调用日志" description="查看工具调用状态、耗时和错误摘要，用于运营排查。" />
      <AdminSection title="调用记录" description="当前展示最近 50 条工具调用。">
        <SimpleTable emptyText="还没有工具调用日志" rows={logs} headers={["工具", "调用 ID", "状态", "耗时", "时间", "错误"]} render={(log) => [
          log.toolName,
          <span key="call" className="font-mono text-xs">{log.callId}</span>,
          log.status,
          log.durationMs,
          <span key="time" className="text-muted-foreground">{log.createdAt}</span>,
          <span key="error" className="max-w-xs truncate text-muted-foreground">{log.errorMessage}</span>,
        ]} />
      </AdminSection>
    </div>
  );
}

export function ToolRuntimeConfigTable({ configs }: { configs: AdminToolRuntimeConfigItem[] }) {
  return (
    <div>
      <AdminPageHeader title="MCP / Function 配置" description="当前以 HTTP 工具版本承载 Function 配置，MCP 配置能力后续接入。" />
      <AdminSection title="运行配置" description="展示工具版本的请求方法、端点模板、超时和响应大小限制。">
        <SimpleTable emptyText="还没有工具运行配置" rows={configs} headers={["工具", "版本", "方法", "端点", "超时", "响应上限", "状态"]} render={(config) => [
          config.toolName,
          config.version,
          config.method,
          <span key="endpoint" className="max-w-sm truncate font-mono text-xs">{config.endpoint}</span>,
          `${config.timeoutMs}ms`,
          `${Math.round(config.maxResponseBytes / 1024)}KB`,
          config.status,
        ]} />
      </AdminSection>
    </div>
  );
}

function SimpleTable<T extends { id: string }>({ headers, rows, emptyText, render }: { headers: string[]; rows: T[]; emptyText: string; render: (row: T) => ReactNode[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
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
