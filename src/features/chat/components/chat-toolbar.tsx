"use client";
/** 会话顶部工具栏：展示当前模型，并承载重试、主题和移动端侧栏入口。 */
import { Menu, Moon, RotateCcw, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { getModelDefinition } from "@/lib/ai/models";

export function ChatToolbar({ modelId, onOpenSidebar, onRetry, canRetry, isStreaming }: { modelId: string; onOpenSidebar: () => void; onRetry: () => void; canRetry: boolean; isStreaming: boolean }) {
    const { resolvedTheme, setTheme } = useTheme();
    return (
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background/85 px-3 backdrop-blur-xl sm:px-5">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenSidebar}>
                    <Menu className="size-5" />
                    <span className="sr-only">打开会话列表</span>
                </Button>
                <div>
                    <p className="text-sm font-medium">{getModelDefinition(modelId)?.name ?? modelId}</p>
                    <p className="text-[11px] text-muted-foreground">在线</p>
                </div>
            </div>
            <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={onRetry} disabled={!canRetry || isStreaming} title="重新生成">
                    <RotateCcw className="size-4" />
                    <span className="sr-only">重新生成</span>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} aria-label="切换主题">
                    {resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                </Button>
            </div>
        </header>
    );
}
