"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ShieldAlert } from "lucide-react";
import { Button } from "@/shared/ui/button";
import type { AdminViewer } from "@/features/admin/domain/types";
import { authClient } from "@/features/auth/client/auth-client";

/** 已登录但缺少后台权限时的安全降级界面。 */
export function AdminAccessDenied({ viewer }: { viewer: AdminViewer }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    if (pending) return;
    setPending(true);
    await authClient.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-5">
      <div className="w-full max-w-md rounded-md border bg-card p-6 text-center shadow-sm">
        <span className="mx-auto flex size-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          <ShieldAlert className="size-6" />
        </span>
        <h1 className="mt-5 text-xl font-semibold">无后台权限</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          当前账号 {viewer.email} 已登录，但未配置 admin / super_admin 角色，也不在 ADMIN_EMAILS 白名单中。
        </p>
        <Button variant="outline" className="mt-6 w-full" disabled={pending} onClick={() => void signOut()}>
          <LogOut className="size-4" />
          {pending ? "正在退出..." : "退出并切换账号"}
        </Button>
      </div>
    </main>
  );
}
