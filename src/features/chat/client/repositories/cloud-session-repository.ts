import type { ChatSession, SessionRepository, SessionSummary } from "@/features/chat/domain/chat";

async function checked<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error((await response.json().catch(() => null) as { code?: string } | null)?.code ?? "SESSION_REQUEST_FAILED");
  return response.json() as Promise<T>;
}

export class CloudSessionRepository implements SessionRepository {
  list() { return fetch("/api/sessions", { cache: "no-store" }).then((response) => checked<SessionSummary[]>(response)); }
  async get(id: string) { const response = await fetch(`/api/sessions/${encodeURIComponent(id)}`, { cache: "no-store" }); return response.status === 404 ? null : checked<ChatSession>(response); }
  async create(session: ChatSession) { return checked<ChatSession>(await fetch("/api/sessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(session) })); }
  async save(session: ChatSession) { return checked<ChatSession>(await fetch(`/api/sessions/${encodeURIComponent(session.id)}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(session) })); }
  async remove(id: string) { const response = await fetch(`/api/sessions/${encodeURIComponent(id)}`, { method: "DELETE" }); if (!response.ok && response.status !== 404) throw new Error("SESSION_DELETE_FAILED"); }
}

export const cloudSessionRepository = new CloudSessionRepository();
