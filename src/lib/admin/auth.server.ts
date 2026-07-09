import "server-only";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma.server";
import { getCurrentSession } from "@/lib/auth/session.server";
import type { AdminViewer } from "@/lib/admin/types";

function configuredAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/** 判断账号是否具备后台权限；早期支持角色和环境变量白名单两种来源。 */
export function isAdminUser(email: string, roleKeys: string[]) {
  return roleKeys.some((key) => key === "admin" || key === "super_admin")
    || configuredAdminEmails().includes(email.toLowerCase());
}

/** 读取当前登录用户及后台权限状态，返回给页面层做登录页或无权限状态分流。 */
export async function getAdminViewer(): Promise<AdminViewer | null> {
  const session = await getCurrentSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      displayName: true,
      roles: { select: { role: { select: { key: true, name: true } } } },
    },
  });
  if (!user) return null;

  const roleKeys = user.roles.map((item) => item.role.key);
  const isAdmin = isAdminUser(user.email, roleKeys);

  return {
    id: user.id,
    name: user.displayName,
    email: user.email,
    role: isAdmin ? "admin" : "user",
    isAdmin,
    roles: user.roles.map((item) => item.role.name || item.role.key),
  };
}

/** 后台受保护页面入口：未登录跳到后台登录页，已登录用户由布局继续判断管理员权限。 */
export async function requireAdminSession() {
  const viewer = await getAdminViewer();
  if (!viewer) redirect("/admin/login");
  return viewer;
}
