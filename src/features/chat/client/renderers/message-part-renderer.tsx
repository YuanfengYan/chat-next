"use client";
/** 消息 Part 分发器：按内容类型选择渲染方式，并为未知扩展提供安全降级。 */
import type { UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { WebSearchPart } from "@/features/chat/client/renderers/web-search-part";
import { ImageRecognitionPart } from "@/features/chat/client/renderers/image-recognition-part";

type MessagePart = UIMessage["parts"][number];
export function MessagePartRenderer({ part }: { part: MessagePart }) {
    if ((part as { type: string }).type === "tool-webSearch") 
      return <WebSearchPart part={part as unknown as React.ComponentProps<typeof WebSearchPart>["part"]} />;
    if ((part as { type: string }).type === "tool-imageRecognition")
      return <ImageRecognitionPart part={part as unknown as React.ComponentProps<typeof ImageRecognitionPart>["part"]} />;
    if (part.type === "file") {
      if (part.url === "attachment:expired") return <div className="my-2 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">图片附件已失效：{part.filename ?? "未命名图片"}</div>;
      return <a href={part.url} target="_blank" rel="noreferrer" className="my-2 block"><img src={part.url} alt={part.filename ?? "用户上传的图片"} className="max-h-72 max-w-full rounded-xl border object-contain" /></a>;
    }
    if (part.type === "text")
        return (
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    p: ({ children }) => <p className="mb-3 last:mb-0 leading-7">{children}</p>,
                    ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5">{children}</ul>,
                    ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5">{children}</ol>,
                    a: ({ children, href }) => (
                        <a className="text-primary underline underline-offset-4" href={href} target="_blank" rel="noreferrer">
                            {children}
                        </a>
                    ),
                    code: ({ children, className }) =>
                        className ? <code className="font-mono text-sm">{children}</code> : <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]">{children}</code>,
                    pre: ({ children }) => <pre className="my-3 overflow-x-auto rounded-xl border bg-zinc-950 p-4 text-zinc-100">{children}</pre>,
                    blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/50 pl-4 text-muted-foreground">{children}</blockquote>,
                }}
            >
                {part.text}
            </ReactMarkdown>
        );

    if (part.type === "reasoning")
        return (
            <details className="rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                <summary>思考过程</summary>
                <div className="mt-2 whitespace-pre-wrap">{part.text}</div>
            </details>
        );
    return <div className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">暂不支持的消息内容：{part.type}</div>;
}
