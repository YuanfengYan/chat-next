"use client";
/** 消息列表：渲染空状态、消息序列和生成状态，并负责跟随最新消息滚动。 */
import { useEffect, useRef } from "react";
import type { UIMessage } from "ai";
import { LoaderCircle, MessageCircleMore } from "lucide-react";
import { MessageItem } from "@/features/chat/components/message-item";

export function MessageList({ messages, isStreaming }: { messages: UIMessage[]; isStreaming: boolean }) {
    const endRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: isStreaming ? "auto" : "smooth", block: "end" });
    }, [messages, isStreaming]);
    if (!messages.length)
        return (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <div className="mb-5 flex size-14 items-center justify-center rounded-2xl border bg-card shadow-sm">
                    <MessageCircleMore className="size-7 text-primary" />
                </div>
                <h2 className="text-xl font-semibold tracking-tight">今天想聊点什么？</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">可以分析问题、编写代码、梳理思路，或只是从一个模糊的想法开始。</p>
            </div>
        );
    return (
        <div className="mx-auto w-full pb-6">
            {messages.map((message) => (
                <MessageItem key={message.id} message={message} />
            ))}
            {isStreaming && (
                <div className="mx-auto flex max-w-3xl items-center gap-2 px-16 text-xs text-muted-foreground">
                    <LoaderCircle className="size-3.5 animate-spin" /> DeepSeek 正在思考
                </div>
            )}
            <div ref={endRef} />
        </div>
    );
}
