import { z } from "zod";
/** 浏览器会话仓库：负责版本化存储、运行时校验和损坏记录隔离。 */
import { toSummary, type ChatSession, type SessionRepository, type SessionSummary } from "@/features/chat/domain/chat";

const STORAGE_KEY = "deepchat:sessions";
const partSchema = z.object({ type: z.string() }).passthrough();
const messageSchema = z.object({ id: z.string(), role: z.enum(["system", "user", "assistant"]), parts: z.array(partSchema) }).passthrough();
const sessionSchema = z.object({ id: z.string(), title: z.string(), modelId: z.string(), skillIds: z.array(z.string()).default([]), messages: z.array(messageSchema), storage: z.literal("local").default("local"), revision: z.number().int().default(0), createdAt: z.string(), updatedAt: z.string() });
const storageSchema = z.object({ version: z.literal(1), sessions: z.array(z.unknown()) });

function readSessions(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const envelope = storageSchema.safeParse(JSON.parse(raw));
    if (!envelope.success) return [];
    return envelope.data.sessions.flatMap((value) => {
      const parsed = sessionSchema.safeParse(value);
      return parsed.success ? [parsed.data as ChatSession] : [];
    });
  } catch { return []; }
}
function writeSessions(sessions: ChatSession[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, sessions }));
}

/** 移除临时图片内容，仅保留可用于历史记录降级展示的附件元数据。 */
export function sanitizeSessionForStorage(session: ChatSession): ChatSession {
  return {
    ...session,
    messages: session.messages.map((message) => ({
      ...message,
      parts: message.parts.map((part) => part.type === "file" ? { ...part, url: "attachment:expired" } : part),
    })),
  };
}

/** 基于 localStorage 的首版持久化实现，保持异步接口以便未来替换远程仓库。 */
export class LocalSessionRepository implements SessionRepository {
  async list(): Promise<SessionSummary[]> { return readSessions().map(toSummary).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); }
  async get(id: string) { return readSessions().find((session) => session.id === id) ?? null; }
  async save(session: ChatSession) { const sessions = readSessions(); const stored = sanitizeSessionForStorage(session); const index = sessions.findIndex((item) => item.id === session.id); if (index >= 0) sessions[index] = stored; else sessions.push(stored); writeSessions(sessions); return stored; }
  async remove(id: string) { writeSessions(readSessions().filter((session) => session.id !== id)); }
}
/** 应用共享的本地会话仓库实例；业务组件通过控制器间接使用。 */
export const localSessionRepository = new LocalSessionRepository();
export { STORAGE_KEY };
