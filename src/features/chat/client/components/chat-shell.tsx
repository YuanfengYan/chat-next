"use client";
/** 聊天工作台外壳：组合侧栏、工具栏、消息区和输入区，不直接处理持久化。 */
import { AlertCircle, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/shared/ui/sheet";
import { ChatComposer } from "@/features/chat/client/components/chat-composer";
import { ChatToolbar } from "@/features/chat/client/components/chat-toolbar";
import { ConversationSidebar } from "@/features/chat/client/components/conversation-sidebar";
import { MessageList } from "@/features/chat/client/components/message-list";
import { useChatController } from "@/features/chat/application/use-chat-controller";
import { userFacingError } from "@/features/ai/domain/errors";

// 聊天工作台外壳组件
export function ChatShell({ sessionId, user }: { sessionId: string; user: { name: string; email: string; image?: string | null } }) {
    const controller = useChatController(sessionId);
    const streaming = controller.status === "streaming" || controller.status === "submitted";
    const displayedError = controller.editError ?? userFacingError(controller.error);
    const sidebar = <ConversationSidebar sessions={controller.summaries} activeId={sessionId} user={user} onCreate={controller.createNew} onSelect={controller.select} onDelete={controller.remove} />;
    return (
        <div className="flex h-dvh overflow-hidden bg-background">
            <div className="hidden w-72 shrink-0 border-r lg:block">{sidebar}</div>
            <Sheet open={controller.sidebarOpen} onOpenChange={controller.setSidebarOpen}>
                <SheetContent side="left">
                    <SheetTitle className="sr-only">会话列表</SheetTitle>
                    {sidebar}
                </SheetContent>
            </Sheet>
            <main className="flex min-w-0 flex-1 flex-col">
                <ChatToolbar
                    modelId={controller.session?.modelId ?? "deepseek-chat"}
                    skillIds={controller.session?.skillIds ?? []}
                    onModelChange={controller.setModelId}
                    onToggleSkill={controller.toggleSkill}
                    onOpenSidebar={() => controller.setSidebarOpen(true)}
                    onRetry={controller.retry}
                    canRetry={controller.messages.some((message) => message.role === "assistant")}
                    isStreaming={streaming}
                />
                {displayedError && (
                    <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:mx-8">
                        <AlertCircle className="size-4 shrink-0" />
                        <span className="flex-1">{displayedError}</span>
                        <Button variant="ghost" size="icon-sm" onClick={() => { controller.clearError(); controller.clearEditError(); }} aria-label="关闭错误">
                            <X className="size-4" />
                        </Button>
                    </div>
                )}
                <div className="min-h-0 flex-1 overflow-y-auto">
                    {controller.loading ? (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">正在载入对话…</div>
                    ) : (
                        <MessageList messages={controller.messages} isStreaming={streaming} onEdit={(messageId, text) => void controller.editAndResend(messageId, text)} />
                    )}
                </div>
                <ChatComposer onSend={controller.send} onStop={controller.stop} isStreaming={streaming} disabled={controller.loading} />
            </main>
        </div>
    );
}
