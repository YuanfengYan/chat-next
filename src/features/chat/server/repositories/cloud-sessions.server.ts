import "server-only";
import type { UIMessage } from "ai";
import { prisma } from "@/infrastructure/db/prisma.server";
import { ensureModelCatalog } from "@/features/ai/server/models/model-catalog.server";
import type { ChatSession, SessionSummary } from "@/features/chat/domain/chat";

const roleToDb = { system: "SYSTEM", user: "USER", assistant: "ASSISTANT" } as const;
const roleFromDb = { SYSTEM: "system", USER: "user", ASSISTANT: "assistant" } as const;

export async function listCloudSessions(userId: string): Promise<SessionSummary[]> {
  const rows = await prisma.chatSession.findMany({ where: { userId, deletedAt: null }, orderBy: { updatedAt: "desc" }, include: { model: { select: { key: true } } } });
  return rows.map((row) => ({ id: row.id, title: row.title, modelId: row.model.key, skillIds: row.skillIds as string[], storage: "cloud", revision: row.revision, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }));
}

export async function getCloudSession(userId: string, id: string): Promise<ChatSession | null> {
  const row = await prisma.chatSession.findFirst({ where: { id, userId, deletedAt: null }, include: { model: { select: { key: true } }, messages: { orderBy: { sequence: "asc" } } } });
  if (!row) return null;
  return {
    id: row.id, title: row.title, modelId: row.model.key, skillIds: row.skillIds as string[], storage: "cloud", revision: row.revision,
    messages: row.messages.map((message) => ({ id: message.externalId, role: roleFromDb[message.role], parts: message.parts as UIMessage["parts"] })),
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  };
}

export async function createCloudSession(userId: string, input: Pick<ChatSession, "id" | "title" | "modelId" | "skillIds">) {
  await ensureModelCatalog();
  const model = await prisma.model.findUnique({ where: { key: input.modelId }, select: { id: true } });
  if (!model) throw new Error("MODEL_NOT_ALLOWED");
  await prisma.chatSession.create({ data: { id: input.id, userId, modelId: model.id, title: input.title, skillIds: input.skillIds } });
  return getCloudSession(userId, input.id);
}

/** 使用 revision 做乐观并发控制并原子替换当前消息快照。 */
export async function saveCloudSession(userId: string, session: ChatSession): Promise<ChatSession> {
  await ensureModelCatalog();
  const model = await prisma.model.findUnique({ where: { key: session.modelId }, select: { id: true } });
  if (!model) throw new Error("MODEL_NOT_ALLOWED");
  await prisma.$transaction(async (tx) => {
    const updated = await tx.chatSession.updateMany({ where: { id: session.id, userId, deletedAt: null, revision: session.revision }, data: { title: session.title, modelId: model.id, skillIds: session.skillIds, revision: { increment: 1 } } });
    if (!updated.count) throw new Error("SESSION_REVISION_CONFLICT");
    await tx.chatMessage.deleteMany({ where: { sessionId: session.id } });
    if (session.messages.length) await tx.chatMessage.createMany({ data: session.messages.map((message, sequence) => ({ sessionId: session.id, externalId: message.id, sequence, role: roleToDb[message.role], parts: message.parts as never })) });
  });
  const saved = await getCloudSession(userId, session.id);
  if (!saved) throw new Error("SESSION_NOT_FOUND");
  return saved;
}

export async function archiveCloudSession(userId: string, id: string) {
  const result = await prisma.chatSession.updateMany({ where: { id, userId, deletedAt: null }, data: { status: "ARCHIVED", deletedAt: new Date(), revision: { increment: 1 } } });
  return result.count > 0;
}

