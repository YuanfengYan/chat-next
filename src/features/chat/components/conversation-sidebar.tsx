"use client";
/** 会话侧栏：纯展示会话摘要，并通过回调发出创建、切换和删除意图。 */
import { MessageSquare, MoreHorizontal, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SessionSummary } from "@/features/chat/types/chat";
import { cn } from "@/lib/utils";

export function ConversationSidebar({ sessions, activeId, onCreate, onSelect, onDelete }: { sessions: SessionSummary[]; activeId: string; onCreate: () => void; onSelect: (id: string) => void; onDelete: (id: string) => void }) {
  return <aside className="flex h-full w-full flex-col bg-muted/35">
    <div className="flex h-16 items-center gap-2 px-4"><div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Sparkles className="size-4" /></div><span className="font-semibold tracking-tight">DeepChat</span></div>
    <div className="px-3 pb-3"><Button variant="outline" className="w-full justify-start bg-background" onClick={onCreate}><Plus className="size-4" />新对话</Button></div>
    <ScrollArea className="min-h-0 flex-1 px-2"><p className="px-3 pb-2 pt-2 text-xs font-medium text-muted-foreground">最近对话</p><div className="space-y-1 pb-4">
      {sessions.map((session) => <div key={session.id} className={cn("group flex items-center rounded-lg pr-1 hover:bg-accent", session.id === activeId && "bg-accent text-accent-foreground")}>
        <button className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 text-left text-sm" onClick={() => onSelect(session.id)}><MessageSquare className="size-4 shrink-0 text-muted-foreground" /><span className="truncate">{session.title}</span></button>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100" aria-label="会话菜单"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem className="text-destructive" onSelect={() => onDelete(session.id)}><Trash2 className="size-4" />删除对话</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
      </div>)}
      {!sessions.length && <p className="px-3 py-8 text-center text-xs text-muted-foreground">还没有历史对话</p>}
    </div></ScrollArea>
    <div className="border-t px-4 py-3 text-xs text-muted-foreground">消息仅保存在当前浏览器</div>
  </aside>;
}
