"use client";
/** 联网搜索结果卡片：展示搜索进度、错误以及可追溯的网页来源。 */
import { AlertCircle, ExternalLink, LoaderCircle, Search } from "lucide-react";

interface SearchSource {
    id: string;
    title: string;
    url: string;
    snippet?: string;
    website?: string;
    publishedAt?: string;
}
interface SearchOutput {
    query: string;
    answer: string;
    sources: SearchSource[];
    searchedAt: string;
}
interface SearchPart {
    state?: string;
    input?: { query?: string };
    output?: SearchOutput;
    errorText?: string;
}

export function WebSearchPart({ part }: { part: SearchPart }) {
    const query = part.input?.query;
    if (part.state === "output-error")
        return (
            <div className="my-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <div className="flex items-center gap-2 font-medium">
                    <AlertCircle className="size-4" />
                    联网搜索失败
                </div>
                <p className="mt-1 text-xs opacity-90">{part.errorText || "搜索服务暂时不可用"}</p>
            </div>
        );
    if (part.state !== "output-available" || !part.output)
        return (
            <div className="my-3 flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                <span>{query ? `正在搜索：${query}` : "正在搜索互联网…"}</span>
            </div>
        );

    return (
        <details className="my-3 rounded-xl border bg-card" open>
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-medium">
                <Search className="size-4 text-primary" />
                <span className="min-w-0 flex-1 truncate">已搜索：{part.output.query}</span>
                <span className="text-xs font-normal text-muted-foreground">{part.output.sources.length} 个来源</span>
            </summary>
            {part.output.sources.length > 0 && (
                <div className="grid gap-2 border-t p-3 sm:grid-cols-2">
                    {part.output.sources.map((source) => (
                        <a
                            key={`${source.id}-${source.url}`}
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="group rounded-lg border bg-background p-2.5 transition-colors hover:bg-accent"
                        >
                            <div className="flex items-start gap-2">
                                <div className="min-w-0 flex-1">
                                    <p className="line-clamp-2 text-xs font-medium leading-5">{source.title}</p>
                                    <p className="mt-1 truncate text-[11px] text-muted-foreground">
                                        {source.website || new URL(source.url).hostname}
                                        {source.publishedAt ? ` · ${source.publishedAt}` : ""}
                                    </p>
                                </div>
                                <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
                            </div>
                        </a>
                    ))}
                </div>
            )}
        </details>
    );
}
