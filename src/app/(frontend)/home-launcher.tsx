"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { localSessionRepository } from "@/features/chat/repositories/local-session-repository";

/** 已登录入口：从浏览器恢复最近会话，没有历史时创建新会话路由。 */
export function HomeLauncher() {
  const router = useRouter();
  useEffect(() => {
    void localSessionRepository.list().then((sessions) => router.replace(`/chat/${sessions[0]?.id ?? crypto.randomUUID()}`));
  }, [router]);
  return <main className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">正在打开 DeepChat…</main>;
}
