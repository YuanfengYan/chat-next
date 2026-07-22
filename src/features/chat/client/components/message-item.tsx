"use client";
/** 单条消息容器：区分用户与助手外观，并将具体内容交给 Part 渲染器。 */
import { Check, Copy, Pencil, Send, Sparkles, UserRound, X } from "lucide-react";
import { useState } from "react";
import type { UIMessage } from "ai";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { MessagePartRenderer } from "@/features/chat/client/renderers/message-part-renderer";
import { cn } from "@/shared/lib/utils";

interface MessageItemProps {
    message: UIMessage;
    isEditing: boolean;
    editDisabled: boolean;
    onStartEdit: () => void;
    onCancelEdit: () => void;
    onEdit: (messageId: string, text: string) => void;
}

export function MessageItem({ message, isEditing, editDisabled, onStartEdit, onCancelEdit, onEdit }: MessageItemProps) {
    const [copied, setCopied] = useState(false);
    const [editText, setEditText] = useState("");
    const [editError, setEditError] = useState<string>();
    const isUser = message.role === "user";
    const text = message.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("\n");
    const files = message.parts.filter((part) => part.type === "file");
    async function copy() {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    }
    function submitEdit() {
        const value = editText.trim();
        if (files.some((file) => file.url === "attachment:expired")) {
            setEditError("历史图片已失效，无法从此消息重新生成。");
            return;
        }
        if (!value && !files.length) {
            setEditError("消息内容不能为空。");
            return;
        }
        onEdit(message.id, value);
        onCancelEdit();
    }
    function startEdit() {
        setEditText(text);
        setEditError(undefined);
        onStartEdit();
    }
    return (
        <article className={cn("group mx-auto flex w-full max-w-3xl gap-3 px-4 py-5 sm:px-8", isUser && "flex-row-reverse pb-10")}>
            <div className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg", isUser ? "bg-primary text-primary-foreground" : "border bg-card text-primary")}>
                {isUser ? <UserRound className="size-4" /> : <Sparkles className="size-4" />}
            </div>
            <div className={cn("relative min-w-0 max-w-[88%]", isUser ? "rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-primary-foreground" : "flex-1 pt-1")}>
                {isEditing ? (
                    <div className="min-w-64 space-y-2 sm:min-w-96">
                        {files.map((part, index) => <MessagePartRenderer key={`${part.type}-${index}`} part={part} />)}
                        <Textarea
                            autoFocus
                            value={editText}
                            onChange={(event) => { setEditText(event.target.value); setEditError(undefined); }}
                            onKeyDown={(event) => {
                                if (event.key === "Escape") { event.preventDefault(); onCancelEdit(); }
                                if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submitEdit(); }
                            }}
                            aria-label="编辑用户消息"
                            className="min-h-20 resize-y bg-background text-foreground"
                        />
                        {editError && <p role="alert" className="text-xs text-destructive">{editError}</p>}
                        <p className="text-xs text-primary-foreground/75">发送后将删除此消息之后的对话并重新生成。</p>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="secondary" size="sm" onClick={onCancelEdit}><X className="size-3.5" />取消</Button>
                            <Button type="button" variant="secondary" size="sm" onClick={submitEdit}><Send className="size-3.5" />发送</Button>
                        </div>
                    </div>
                ) : message.parts.map((part, index) => (
                    <MessagePartRenderer key={`${part.type}-${index}`} part={part} />
                ))}
                {isUser && !isEditing && (
                    <Button variant="ghost" size="icon-sm" className="pointer-events-none absolute -bottom-9 right-0 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:pointer-events-auto group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100" onClick={startEdit} disabled={editDisabled} aria-label="编辑消息">
                        <Pencil className="size-3.5" />
                    </Button>
                )}
                {!isUser && text && (
                    <Button variant="ghost" size="icon-sm" className="mt-1 -ml-2 opacity-0 group-hover:opacity-100" onClick={copy} aria-label="复制回复">
                        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    </Button>
                )}
            </div>
        </article>
    );
}
