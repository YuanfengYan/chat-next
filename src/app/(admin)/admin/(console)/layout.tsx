import type { ReactNode } from "react";
import { AdminAccessDenied } from "@/features/admin/components/admin-access-denied";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { requireAdminSession } from "@/lib/admin/auth.server";

export default async function AdminConsoleLayout({ children }: { children: ReactNode }) {
  const viewer = await requireAdminSession();
  if (!viewer.isAdmin) return <AdminAccessDenied viewer={viewer} />;
  return <AdminShell viewer={viewer}>{children}</AdminShell>;
}
