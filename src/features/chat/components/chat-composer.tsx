"use client";
/** 消息输入组件：管理本地草稿、键盘发送和停止生成交互。 */
import { ArrowUp, Paperclip, Square } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ChatDraft } from "@/features/chat/types/chat";

export function ChatComposer({ onSend, onStop, isStreaming, disabled }: { onSend: (draft: ChatDraft) => void; onStop: () => void; isStreaming: boolean; disabled?: boolean }) {
  const [text, setText] = useState("");
  function submit() { const value = text.trim(); if (!value || isStreaming || disabled) return; onSend({ text: value, attachments: [] }); setText(""); }
  return <div className="mx-auto w-full max-w-3xl px-4 pb-4 sm:px-8 sm:pb-6">
    <div className="rounded-2xl border bg-card p-2 shadow-[0_8px_30px_rgb(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-ring/40">
      <Textarea value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } }} placeholder="给 DeepSeek 发消息…" className="min-h-12 max-h-40 border-0 px-2 py-2.5 shadow-none focus-visible:ring-0" disabled={disabled} />
      <div className="flex items-center justify-between pt-1">
        <Button variant="ghost" size="icon" disabled title="附件能力即将开放"><Paperclip className="size-4" /><span className="sr-only">添加附件</span></Button>
        {isStreaming ? <Button size="icon" onClick={onStop} aria-label="停止生成"><Square className="size-3.5 fill-current" /></Button> : <Button size="icon" onClick={submit} disabled={!text.trim() || disabled} aria-label="发送"><ArrowUp className="size-4" /></Button>}
      </div>
    </div>
    <p className="mt-2 text-center text-[11px] text-muted-foreground">AI 可能会犯错，请核查重要信息</p>
  </div>;
}
