"use client";

import { ArrowUp, Paperclip, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import type { ChatDraft, PendingAttachment } from "@/features/chat/domain/chat";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/bmp"]);
const MAX_FILE_SIZE = 4 * 1024 * 1024;
const MAX_FILES = 3;

function readDimensions(url: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("无法读取图片"));
    image.src = url;
  });
}

/** 聊天输入组件：管理文本草稿、临时图片附件与发送交互。 */
export function ChatComposer({ onSend, onStop, isStreaming, disabled }: { onSend: (draft: ChatDraft) => void; onStop: () => void; isStreaming: boolean; disabled?: boolean }) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [error, setError] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);
  const attachmentsRef = useRef(attachments);
  useEffect(() => { attachmentsRef.current = attachments; }, [attachments]);
  useEffect(() => () => attachmentsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl)), []);

  async function selectFiles(files: FileList | null) {
    if (!files) return;
    setError(undefined);
    const remaining = MAX_FILES - attachments.length;
    if (files.length > remaining) setError(`每条消息最多上传 ${MAX_FILES} 张图片。`);
    const next: PendingAttachment[] = [];
    for (const file of Array.from(files).slice(0, remaining)) {
      if (!ACCEPTED_TYPES.has(file.type)) { setError("仅支持 JPG、PNG 或 BMP 图片。"); continue; }
      if (file.size > MAX_FILE_SIZE) { setError(`图片“${file.name}”超过 4MB。`); continue; }
      const previewUrl = URL.createObjectURL(file);
      try {
        const dimensions = await readDimensions(previewUrl);
        next.push({ id: crypto.randomUUID(), name: file.name, type: file.type, size: file.size, file, previewUrl, ...dimensions });
      } catch { URL.revokeObjectURL(previewUrl); setError(`无法读取图片“${file.name}”。`); }
    }
    setAttachments((current) => [...current, ...next]);
    if (inputRef.current) inputRef.current.value = "";
  }
  function remove(id: string) {
    setAttachments((current) => { const target = current.find((item) => item.id === id); if (target) URL.revokeObjectURL(target.previewUrl); return current.filter((item) => item.id !== id); });
  }
  function submit() {
    const value = text.trim();
    if ((!value && !attachments.length) || isStreaming || disabled) return;
    onSend({ text: value, attachments });
    setText(""); setAttachments([]); setError(undefined);
  }
  return <div className="mx-auto w-full max-w-3xl px-4 pb-4 sm:px-8 sm:pb-6">
    <div className="rounded-2xl border bg-card p-2 shadow-[0_8px_30px_rgb(0,0,0,0.06)] focus-within:ring-2 focus-within:ring-ring/40">
      {attachments.length > 0 && <div className="flex gap-2 overflow-x-auto p-1 pb-2">{attachments.map((item) => <div key={item.id} className="relative shrink-0"><img src={item.previewUrl} alt={item.name} className="size-20 rounded-lg border object-cover" /><Button type="button" variant="secondary" size="icon-sm" className="absolute -right-1 -top-1 size-5 rounded-full" onClick={() => remove(item.id)} aria-label={`移除 ${item.name}`}><X className="size-3" /></Button></div>)}</div>}
      <Textarea value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } }} placeholder="给 DeepSeek 发消息…" className="min-h-12 max-h-40 border-0 px-2 py-2.5 shadow-none focus-visible:ring-0" disabled={disabled} />
      <div className="flex items-center justify-between pt-1">
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/bmp" multiple className="hidden" onChange={(event) => void selectFiles(event.target.files)} />
        <Button type="button" variant="ghost" size="icon" disabled={disabled || isStreaming || attachments.length >= MAX_FILES} onClick={() => inputRef.current?.click()} title="添加图片"><Paperclip className="size-4" /><span className="sr-only">添加图片</span></Button>
        {isStreaming ? <Button size="icon" onClick={onStop} aria-label="停止生成"><Square className="size-3.5 fill-current" /></Button> : <Button size="icon" onClick={submit} disabled={(!text.trim() && !attachments.length) || disabled} aria-label="发送"><ArrowUp className="size-4" /></Button>}
      </div>
    </div>
    {error && <p role="alert" className="mt-2 text-center text-xs text-destructive">{error}</p>}
    <p className="mt-2 text-center text-[11px] text-muted-foreground">AI 可能会犯错，请核查重要信息</p>
  </div>;
}
