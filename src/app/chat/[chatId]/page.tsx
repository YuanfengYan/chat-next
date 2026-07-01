import { ChatShell } from "@/features/chat/components/chat-shell";
/** 会话深链页面：解析路由中的会话 ID，并交给聊天工作台加载。 */
export default async function ChatPage({ params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params;
  return <ChatShell key={chatId} sessionId={chatId} />;
}
