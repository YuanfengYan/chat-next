"use client";
/** 会话顶部工具栏：展示当前模型，并承载重试、主题和移动端侧栏入口。 */
import { Brain, ChevronDown, Menu, Moon, RotateCcw, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/shared/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { getModelDefinition, MODEL_CATALOG } from "@/features/ai/domain/models";
import { SKILL_CATALOG } from "@/features/ai/domain/skills";

interface ChatToolbarProps { modelId: string; skillIds: string[]; onModelChange: (id: string) => void; onToggleSkill: (id: string) => void; onOpenSidebar: () => void; onRetry: () => void; canRetry: boolean; isStreaming: boolean; }
export function ChatToolbar({ modelId, skillIds, onModelChange, onToggleSkill, onOpenSidebar, onRetry, canRetry, isStreaming }: ChatToolbarProps) {
    const { resolvedTheme, setTheme } = useTheme();
    return (
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background/85 px-3 backdrop-blur-xl sm:px-5">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenSidebar}>
                    <Menu className="size-5" />
                    <span className="sr-only">打开会话列表</span>
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" className="h-auto gap-1 px-2 py-1" disabled={isStreaming}><span className="text-left"><span className="block text-sm font-medium">{getModelDefinition(modelId)?.name ?? modelId}</span><span className="block text-[11px] font-normal text-muted-foreground">切换模型</span></span><ChevronDown className="size-3.5" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-72"><DropdownMenuLabel className="px-2 py-1.5 text-xs text-muted-foreground">模型由对应服务端 API Key 驱动</DropdownMenuLabel><DropdownMenuSeparator className="my-1 h-px bg-border" />{MODEL_CATALOG.map((model) => <DropdownMenuItem key={model.id} onSelect={() => onModelChange(model.id)} className={model.id === modelId ? "bg-accent" : undefined}><span><span className="block">{model.name}</span><span className="block text-xs text-muted-foreground">{model.description} · {model.provider}</span></span></DropdownMenuItem>)}</DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="flex items-center gap-1">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" disabled={isStreaming} className="gap-1"><Brain className="size-4" /><span className="hidden sm:inline">Skill{skillIds.length ? ` (${skillIds.length})` : ""}</span></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-72"><DropdownMenuLabel className="px-2 py-1.5 text-xs text-muted-foreground">当前会话启用的能力</DropdownMenuLabel>{SKILL_CATALOG.map((skill) => <DropdownMenuCheckboxItem key={skill.id} checked={skillIds.includes(skill.id)} onCheckedChange={() => onToggleSkill(skill.id)}><span><span className="block">{skill.name}</span><span className="block text-xs text-muted-foreground">{skill.description}</span></span></DropdownMenuCheckboxItem>)}</DropdownMenuContent>
                </DropdownMenu>
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
