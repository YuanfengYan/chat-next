"use client";
/** 单条消息容器：区分用户与助手外观，并将具体内容交给 Part 渲染器。 */
import { Check, Copy, Sparkles, UserRound } from "lucide-react";
import { useState } from "react";
import type { UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { MessagePartRenderer } from "@/features/chat/renderers/message-part-renderer";
import { cn } from "@/lib/utils";

export function MessageItem({ message }: { message: UIMessage }) {
    const [copied, setCopied] = useState(false);
    const isUser = message.role === "user";
    const text = message.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("\n");
    async function copy() {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    }
    return (
        <article className={cn("group mx-auto flex w-full max-w-3xl gap-3 px-4 py-5 sm:px-8", isUser && "flex-row-reverse")}>
            <div className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg", isUser ? "bg-primary text-primary-foreground" : "border bg-card text-primary")}>
                {isUser ? <UserRound className="size-4" /> : <Sparkles className="size-4" />}
            </div>
            <div className={cn("min-w-0 max-w-[88%]", isUser ? "rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-primary-foreground" : "flex-1 pt-1")}>
                {message.parts.map((part, index) => (
                    <MessagePartRenderer key={`${part.type}-${index}`} part={part} />
                ))}
                {!isUser && text && (
                    <Button variant="ghost" size="icon-sm" className="mt-1 -ml-2 opacity-0 group-hover:opacity-100" onClick={copy} aria-label="复制回复">
                        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    </Button>
                )}
            </div>
        </article>
    );
}
