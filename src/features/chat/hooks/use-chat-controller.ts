"use client";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { localSessionRepository } from "@/features/chat/repositories/local-session-repository";
import { useChatStore } from "@/features/chat/store/chat-store";
import { createSession, titleFromText, toSummary, type ChatDraft, type ChatSession } from "@/features/chat/types/chat";
import { createChatTransport } from "@/lib/ai/transport";

export function useChatController(sessionId: string) {
    const router = useRouter();
    const [session, setSession] = useState<ChatSession | null>(null);
    const [loading, setLoading] = useState(true);
    const messagesRef = useRef<UIMessage[]>([]);
    const sessionRef = useRef<ChatSession | null>(null);
    const { summaries, setSummaries, upsertSummary, removeSummary, setActiveSessionId, sidebarOpen, setSidebarOpen, setHydrated } = useChatStore();
    const transport = useMemo(() => createChatTransport(), []);

    // 当前会话的消息并持久化到本地存储
    const persist = useCallback(
        async (messages: UIMessage[]) => {
            const current = sessionRef.current;
            if (!current) return;
            const next = { ...current, messages, updatedAt: new Date().toISOString() };
            sessionRef.current = next;
            setSession(next);
            upsertSummary(toSummary(next));
            await localSessionRepository.save(next);
        },
        [upsertSummary],
    );
// 使用 AI SDK 的 useChat hook 管理消息流和状态
    const chat = useChat({
        id: sessionId,
        transport,
        messages: [],
        experimental_throttle: 40,
        onFinish: ({ messages }) => {
            void persist(messages);
        },
        onError: () => {
            window.setTimeout(() => void persist(messagesRef.current), 0);
        },
    });
    useEffect(() => {
        messagesRef.current = chat.messages;
    }, [chat.messages]);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            let current = await localSessionRepository.get(sessionId);
            if (!current) {
                current = createSession(sessionId);
                await localSessionRepository.save(current);
            }
            if (cancelled) return;
            sessionRef.current = current;
            setSession(current);
            chat.setMessages(current.messages);
            setSummaries(await localSessionRepository.list());
            setActiveSessionId(sessionId);
            setHydrated(true);
            setLoading(false);
        }
        void load();
        return () => {
            cancelled = true;
        };
        // A new route mounts a fresh workspace keyed by sessionId.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId]);

    const send = useCallback(
        (draft: ChatDraft) => {
            const current = sessionRef.current;
            if (!current || !draft.text.trim()) return;
            if (!current.messages.length) {
                const next = { ...current, title: titleFromText(draft.text), updatedAt: new Date().toISOString() };
                sessionRef.current = next;
                setSession(next);
                upsertSummary(toSummary(next));
            }
            void chat.sendMessage({ text: draft.text }, { body: { modelId: current.modelId } });
        },
        [chat, upsertSummary],
    );
    const stop = useCallback(() => {
        chat.stop();
        window.setTimeout(() => void persist(messagesRef.current), 0);
    }, [chat, persist]);
    const retry = useCallback(() => {
        const current = sessionRef.current;
        if (current) void chat.regenerate({ body: { modelId: current.modelId } });
    }, [chat]);
    const createNew = useCallback(() => {
        const next = createSession();
        setSidebarOpen(false);
        router.push(`/chat/${next.id}`);
    }, [router, setSidebarOpen]);
    const select = useCallback(
        (id: string) => {
            if (id !== sessionId && chat.status !== "streaming" && chat.status !== "submitted") {
                setSidebarOpen(false);
                router.push(`/chat/${id}`);
            }
        },
        [chat.status, router, sessionId, setSidebarOpen],
    );
    const remove = useCallback(
        async (id: string) => {
            await localSessionRepository.remove(id);
            removeSummary(id);
            if (id === sessionId) {
                const next = summaries.find((item) => item.id !== id);
                router.replace(next ? `/chat/${next.id}` : `/chat/${crypto.randomUUID()}`);
            }
        },
        [removeSummary, router, sessionId, summaries],
    );

    return {
        session,
        summaries,
        messages: chat.messages,
        status: chat.status,
        error: chat.error,
        clearError: chat.clearError,
        loading,
        sidebarOpen,
        setSidebarOpen,
        send,
        stop,
        retry,
        createNew,
        select,
        remove,
    };
}
