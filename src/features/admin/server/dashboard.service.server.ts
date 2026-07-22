import "server-only";

import { prisma } from "@/infrastructure/db/prisma.server";
import { formatAdminDateTime } from "@/features/admin/domain/format";
import { getAdminToolList } from "@/features/admin/server/tools.service.server";
import type { AdminDashboardOverview, AdminSessionListItem } from "@/features/admin/domain/types";

async function getRecentSessions(): Promise<AdminSessionListItem[]> {
  const sessions = await prisma.chatSession.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 8,
    select: {
      id: true,
      title: true,
      status: true,
      updatedAt: true,
      user: { select: { displayName: true, email: true } },
      model: { select: { name: true } },
      _count: { select: { messages: true, generations: true } },
    },
  });

  return sessions.map((session) => ({
    id: session.id,
    title: session.title,
    owner: session.user.displayName || session.user.email,
    model: session.model.name,
    status: session.status === "ACTIVE" ? "活跃" : "已归档",
    messages: session._count.messages,
    generations: session._count.generations,
    updatedAt: formatAdminDateTime(session.updatedAt),
  }));
}

/** 后台仪表盘聚合数据，仅返回运营展示所需 DTO。 */
export async function getAdminDashboardOverview(): Promise<AdminDashboardOverview> {
  const [sessionCount, activeSessionCount, toolCount, enabledToolCount, userCount, recentTools, recentSessions] = await Promise.all([
    prisma.chatSession.count({ where: { deletedAt: null } }),
    prisma.chatSession.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    prisma.tool.count(),
    prisma.tool.count({ where: { isEnabled: true } }),
    prisma.user.count({ where: { deletedAt: null } }),
    getAdminToolList(6),
    getRecentSessions(),
  ]);

  return {
    metrics: [
      { label: "会话总数", value: String(sessionCount), hint: "平台云端会话" },
      { label: "活跃会话", value: String(activeSessionCount), hint: "未归档且未删除" },
      { label: "工具数量", value: String(toolCount), hint: "平台工具目录" },
      { label: "启用工具", value: String(enabledToolCount), hint: "可被模型调用" },
      { label: "注册用户", value: String(userCount), hint: "未删除账号" },
    ],
    recentTools,
    recentSessions,
  };
}
