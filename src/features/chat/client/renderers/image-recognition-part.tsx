"use client";

import { AlertCircle, ImageIcon, LoaderCircle } from "lucide-react";
import type { ImageRecognitionResult } from "@/features/ai/domain/tool-results";

interface RecognitionPart { state: string; input?: { imageIndexes?: number[] }; output?: ImageRecognitionResult; errorText?: string }

/** 百度图片识别工具结果卡片。 */
export function ImageRecognitionPart({ part }: { part: RecognitionPart }) {
  if (part.state === "input-streaming" || part.state === "input-available") return <div className="my-2 flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />正在识别图片文字…</div>;
  if (part.state === "output-error") return <div className="my-2 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"><AlertCircle className="size-4" />{part.errorText || "图片识别失败"}</div>;
  if (!part.output) return null;
  return <div className="my-3 rounded-xl border bg-card p-3 text-sm">
    <div className="mb-2 flex items-center gap-2 font-medium"><ImageIcon className="size-4" />文字识别结果</div>
    <div className="space-y-3">{part.output.images.map((image) => <section key={image.index}>
      <p className="text-xs text-muted-foreground">图片 {image.index + 1}{image.direction !== undefined ? ` · 方向 ${image.direction}` : ""}</p>
      {image.words?.length > 0 && <ul className="mt-1 space-y-1">{image.words.map((item, index) => <li key={`${item.text}-${index}`}><span>{item.text}</span><span className="ml-2 text-xs text-muted-foreground">位置 ({item.location.left}, {item.location.top}, {item.location.width}, {item.location.height}){item.probability ? ` · 置信度 ${(item.probability.average * 100).toFixed(0)}%` : ""}</span></li>)}</ul>}
      {!image.words?.length && <p className="mt-1 text-muted-foreground">未识别到文字。</p>}
    </section>)}</div>
  </div>;
}
