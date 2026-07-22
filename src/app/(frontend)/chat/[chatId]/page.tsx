import { ChatShell } from "@/features/chat/client/components/chat-shell";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/features/auth/server/session.server";
/** 会话深链页面：解析路由中的会话 ID，并交给聊天工作台加载。 */
export default async function ChatPage({ params }: { params: Promise<{ chatId: string }> }) {
  const session = await getCurrentSession();
  if (!session) redirect("/auth");
  const { chatId } = await params;
  return <ChatShell key={chatId} sessionId={chatId} user={{ name: session.user.name, email: session.user.email, image: session.user.image }} />;
}
