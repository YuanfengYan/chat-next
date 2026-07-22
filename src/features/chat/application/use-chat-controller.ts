"use client";
import { useChat } from "@ai-sdk/react";
import type { FileUIPart, UIMessage } from "ai";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { localSessionRepository } from "@/features/chat/client/repositories/local-session-repository";
import { cloudSessionRepository } from "@/features/chat/client/repositories/cloud-session-repository";
import { useChatStore } from "@/features/chat/client/stores/chat-store";
import { createSession, titleFromText, toSummary, type ChatDraft, type ChatSession } from "@/features/chat/domain/chat";
import { createChatTransport } from "@/features/chat/client/transport/chat-transport";

export function useChatController(sessionId: string) {
    const router = useRouter();
    const [session, setSession] = useState<ChatSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [editError, setEditError] = useState<string>();
    const messagesRef = useRef<UIMessage[]>([]);
    const sessionRef = useRef<ChatSession | null>(null);
    const { summaries, setSummaries, upsertSummary, removeSummary, setActiveSessionId, sidebarOpen, setSidebarOpen, setHydrated } = useChatStore();
    const transport = useMemo(() => createChatTransport(), []);
    const repositoryFor = useCallback((current: ChatSession) => current.storage === "cloud" ? cloudSessionRepository : localSessionRepository, []);

    // 当前会话的消息并持久化到本地存储
    const persist = useCallback(
        async (messages: UIMessage[]) => {
            const current = sessionRef.current;
            if (!current) return;
            const next = { ...current, messages, updatedAt: new Date().toISOString() };
            sessionRef.current = next;
            setSession(next);
            upsertSummary(toSummary(next));
            const saved = await repositoryFor(next).save(next);
            sessionRef.current = saved;
            setSession(saved);
            upsertSummary(toSummary(saved));
        },
        [repositoryFor, upsertSummary],
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
            if (!current) current = await cloudSessionRepository.get(sessionId);
            if (!current) {
                current = createSession(sessionId, "cloud");
                current = await cloudSessionRepository.create(current);
            }
            if (cancelled) return;
            sessionRef.current = current;
            setSession(current);
            chat.setMessages(current.messages);
            const [local, cloud] = await Promise.all([localSessionRepository.list(), cloudSessionRepository.list()]);
            setSummaries([...local, ...cloud].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
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
        async (draft: ChatDraft) => {
            const current = sessionRef.current;
            if (!current || (!draft.text.trim() && !draft.attachments.length)) return;
            if (!current.messages.length) {
                const next = { ...current, title: titleFromText(draft.text), updatedAt: new Date().toISOString() };
                sessionRef.current = next;
                setSession(next);
                upsertSummary(toSummary(next));
            }
            const files: FileUIPart[] = await Promise.all(draft.attachments.map(async (item) => ({
                type: "file" as const, mediaType: item.type, filename: item.name,
                url: await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(item.file); }),
            })));
            await chat.sendMessage(draft.text.trim() ? { text: draft.text, files } : { files }, { body: { modelId: current.modelId, skillIds: current.skillIds, persistence: current.storage } });
        },
        [chat, upsertSummary],
    );
    /** 替换指定用户消息并从该节点重新生成；AI SDK 会截断该消息后的旧分支。 */
    const editAndResend = useCallback(
        async (messageId: string, text: string) => {
            const current = sessionRef.current;
            const target = messagesRef.current.find((message) => message.id === messageId);
            if (!current || target?.role !== "user" || chat.status === "streaming" || chat.status === "submitted") return;

            const files = target.parts.filter((part): part is FileUIPart => part.type === "file");
            if (files.some((file) => file.url === "attachment:expired")) {
                setEditError("历史图片已失效，无法从此消息重新生成。");
                return;
            }
            const value = text.trim();
            if (!value && !files.length) {
                setEditError("消息内容不能为空。");
                return;
            }
            setEditError(undefined);

            const firstUserMessage = messagesRef.current.find((message) => message.role === "user");
            if (firstUserMessage?.id === messageId) {
                const next = { ...current, title: titleFromText(value), updatedAt: new Date().toISOString() };
                sessionRef.current = next;
                setSession(next);
                upsertSummary(toSummary(next));
            }

            const options = { body: { modelId: current.modelId, skillIds: current.skillIds, persistence: current.storage } };
            if (value) await chat.sendMessage({ messageId, text: value, files }, options);
            else await chat.sendMessage({ messageId, files }, options);
        },
        [chat, upsertSummary],
    );
    const stop = useCallback(() => {
        chat.stop();
        window.setTimeout(() => void persist(messagesRef.current), 0);
    }, [chat, persist]);
    const retry = useCallback(() => {
        const current = sessionRef.current;
        if (current) void chat.regenerate({ body: { modelId: current.modelId, skillIds: current.skillIds, persistence: current.storage } });
    }, [chat]);
    const updateConfiguration = useCallback(async (changes: Partial<Pick<ChatSession, "modelId" | "skillIds">>) => {
        const current = sessionRef.current;
        if (!current) return;
        const next = { ...current, ...changes, updatedAt: new Date().toISOString() };
        sessionRef.current = next;
        setSession(next);
        upsertSummary(toSummary(next));
        const saved = await repositoryFor(next).save(next);
        sessionRef.current = saved;
        setSession(saved);
    }, [repositoryFor, upsertSummary]);
    const setModelId = useCallback((modelId: string) => { void updateConfiguration({ modelId }); }, [updateConfiguration]);
    const toggleSkill = useCallback((skillId: string) => {
        const current = sessionRef.current;
        if (!current) return;
        const skillIds = current.skillIds.includes(skillId) ? current.skillIds.filter((id) => id !== skillId) : [...current.skillIds, skillId];
        void updateConfiguration({ skillIds });
    }, [updateConfiguration]);
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
            const target = summaries.find((item) => item.id === id);
            await (target?.storage === "cloud" ? cloudSessionRepository : localSessionRepository).remove(id);
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
        editError,
        clearError: chat.clearError,
        clearEditError: () => setEditError(undefined),
        loading,
        sidebarOpen,
        setSidebarOpen,
        send,
        editAndResend,
        stop,
        retry,
        setModelId,
        toggleSkill,
        createNew,
        select,
        remove,
    };
}
