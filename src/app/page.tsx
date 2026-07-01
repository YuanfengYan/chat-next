"use client";
/** 应用入口页：从本地会话中恢复最近对话，没有历史记录时创建新会话路由。 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { localSessionRepository } from "@/features/chat/repositories/local-session-repository";

export default function HomePage() {
    const router = useRouter();
    useEffect(() => {
        void localSessionRepository.list().then((sessions) => router.replace(`/chat/${sessions[0]?.id ?? crypto.randomUUID()}`));
    }, [router]);
    return <main className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">正在打开 DeepChat…</main>;
}
