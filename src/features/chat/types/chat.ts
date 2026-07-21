import type { UIMessage } from "ai";

/** 完整会话实体；消息只在激活会话时加载，避免全局状态随流式内容频繁更新。 */
export interface ChatSession { id: string; title: string; modelId: string; skillIds: string[]; messages: UIMessage[]; storage: "local" | "cloud"; revision: number; createdAt: string; updatedAt: string; }
/** 会话列表使用的轻量摘要，不包含消息正文。 */
export type SessionSummary = Omit<ChatSession, "messages">;
/** 尚未上传的附件描述，为后续多模态输入预留。 */
export interface PendingAttachment { id: string; name: string; type: string; size: number; file: File; previewUrl: string; width: number; height: number; }
/** 输入框草稿模型，文本之外可继续扩展附件等内容。 */
export interface ChatDraft { text: string; attachments: PendingAttachment[]; }
/** 会话持久化契约；本地存储和未来服务端存储都实现同一接口。 */
export interface SessionRepository {
  list(): Promise<SessionSummary[]>;
  get(id: string): Promise<ChatSession | null>;
  save(session: ChatSession): Promise<ChatSession>;
  remove(id: string): Promise<void>;
}
/** 将完整会话转换成列表可用的摘要。 */
export function toSummary(session: ChatSession): SessionSummary {
  return { id: session.id, title: session.title, modelId: session.modelId, skillIds: session.skillIds, storage: session.storage, revision: session.revision, createdAt: session.createdAt, updatedAt: session.updatedAt };
}
/** 创建带默认模型和时间戳的新会话。 */
export function createSession(id = crypto.randomUUID(), storage: "local" | "cloud" = "local"): ChatSession {
  const now = new Date().toISOString();
  return { id, title: "新对话", modelId: "deepseek-chat", skillIds: [], messages: [], storage, revision: 0, createdAt: now, updatedAt: now };
}
/** 使用首条用户消息生成简短的会话标题。 */
export function titleFromText(text: string) { return text.trim().replace(/\s+/g, " ").slice(0, 28) || "新对话"; }
