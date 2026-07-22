import { AdminEmptyState, AdminPageHeader, AdminSection, StatusPill } from "@/features/admin/components/admin-page";
import type { AdminDashboardOverview } from "@/features/admin/domain/types";

/** 后台仪表盘首屏，聚合账号、工具和会话运营概览。 */
export function DashboardOverview({ overview }: { overview: AdminDashboardOverview }) {
  return (
    <div className="space-y-5">
      <AdminPageHeader title="仪表盘" description="查看平台账号、工具和云端会话的基础运营数据。" />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {overview.metrics.map((metric) => (
          <div key={metric.label} className="rounded-md border bg-card p-4">
            <p className="text-xs text-muted-foreground">{metric.label}</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{metric.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{metric.hint}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <AdminSection title="最近工具" description="最近更新的工具目录和模型绑定情况。">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-muted/45 text-left text-xs text-muted-foreground">
                <tr><th className="px-4 py-3 font-medium">工具</th><th className="px-4 py-3 font-medium">状态</th><th className="px-4 py-3 font-medium">绑定</th><th className="px-4 py-3 font-medium">更新</th></tr>
              </thead>
              <tbody className="divide-y">
                {overview.recentTools.map((tool) => (
                  <tr key={tool.id}><td className="px-4 py-3"><p className="font-medium">{tool.name}</p><p className="mt-1 text-xs text-muted-foreground">{tool.key}</p></td><td className="px-4 py-3"><StatusPill active={tool.enabled} /></td><td className="px-4 py-3">{tool.modelBindings}</td><td className="px-4 py-3 text-muted-foreground">{tool.updatedAt}</td></tr>
                ))}
              </tbody>
            </table>
            {!overview.recentTools.length && <AdminEmptyState text="还没有工具数据" />}
          </div>
        </AdminSection>

        <AdminSection title="最近会话" description="最近更新的云端会话和模型使用概览。">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-muted/45 text-left text-xs text-muted-foreground">
                <tr><th className="px-4 py-3 font-medium">会话</th><th className="px-4 py-3 font-medium">用户</th><th className="px-4 py-3 font-medium">模型</th><th className="px-4 py-3 font-medium">更新</th></tr>
              </thead>
              <tbody className="divide-y">
                {overview.recentSessions.map((session) => (
                  <tr key={session.id}><td className="px-4 py-3 font-medium">{session.title}</td><td className="px-4 py-3 text-muted-foreground">{session.owner}</td><td className="px-4 py-3">{session.model}</td><td className="px-4 py-3 text-muted-foreground">{session.updatedAt}</td></tr>
                ))}
              </tbody>
            </table>
            {!overview.recentSessions.length && <AdminEmptyState text="还没有云端会话数据" />}
          </div>
        </AdminSection>
      </div>
    </div>
  );
}
