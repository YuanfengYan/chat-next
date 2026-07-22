import "server-only";

import type { UIMessage } from "ai";
import { ensureModelCatalog } from "@/features/ai/server/models/model-catalog.server";
import { prisma } from "@/infrastructure/db/prisma.server";

export interface CloudGenerationContext {
  id: string;
  sessionId: string;
  startedAt: Date;
}

/** 校验云会话归属、保存最新用户消息并创建生成记录。 */
export async function startCloudGeneration(input: {
  userId: string;
  sessionId: string;
  modelId: string;
  skillIds: string[];
  messages: UIMessage[];
}): Promise<CloudGenerationContext> {
  await ensureModelCatalog();
  const cloudSession = await prisma.chatSession.findFirst({
    where: { id: input.sessionId, userId: input.userId, deletedAt: null },
    include: { model: { select: { key: true } } },
  });
  if (!cloudSession) throw new Error("SESSION_NOT_FOUND");
  if (cloudSession.model.key !== input.modelId) throw new Error("MODEL_MISMATCH");

  const lastUserMessage = [...input.messages].reverse().find((message) => message.role === "user");
  if (lastUserMessage) {
    const existing = await prisma.chatMessage.findUnique({
      where: { sessionId_externalId: { sessionId: cloudSession.id, externalId: lastUserMessage.id } },
      select: { id: true, sequence: true },
    });
    if (existing) {
      await prisma.$transaction(async (tx) => {
        // 编辑历史用户消息时丢弃后续分支；Generation 审计记录通过外键保留。
        await tx.chatMessage.deleteMany({
          where: { sessionId: cloudSession.id, sequence: { gt: existing.sequence } },
        });
        await tx.chatMessage.update({
          where: { id: existing.id },
          data: { parts: lastUserMessage.parts as never },
        });
      });
    } else {
      const aggregate = await prisma.chatMessage.aggregate({ where: { sessionId: cloudSession.id }, _max: { sequence: true } });
      await prisma.chatMessage.create({
        data: {
          sessionId: cloudSession.id,
          externalId: lastUserMessage.id,
          sequence: (aggregate._max.sequence ?? -1) + 1,
          role: "USER",
          parts: lastUserMessage.parts as never,
        },
      });
    }
  }

  const created = await prisma.generation.create({
    data: {
      sessionId: cloudSession.id,
      modelId: cloudSession.modelId,
      status: "RUNNING",
      startedAt: new Date(),
      configSnapshot: { modelId: input.modelId, skillIds: input.skillIds },
    },
  });
  return { id: created.id, sessionId: cloudSession.id, startedAt: created.startedAt ?? new Date() };
}

export function updateGenerationTools(
  context: CloudGenerationContext,
  modelId: string,
  skillIds: string[],
  tools: Array<{ key: string; version: number; toolVersionId: string }>,
) {
  return prisma.generation.update({
    where: { id: context.id },
    data: { configSnapshot: { modelId, skillIds, tools } },
  });
}

/** 保存助手消息并结束云端生成生命周期。 */
export async function completeCloudGeneration(context: CloudGenerationContext, responseMessage: UIMessage, finishReason: string | undefined, isAborted: boolean) {
  const aggregate = await prisma.chatMessage.aggregate({ where: { sessionId: context.sessionId }, _max: { sequence: true } });
  const saved = await prisma.chatMessage.upsert({
    where: { sessionId_externalId: { sessionId: context.sessionId, externalId: responseMessage.id } },
    update: { parts: responseMessage.parts as never },
    create: {
      sessionId: context.sessionId,
      externalId: responseMessage.id,
      sequence: (aggregate._max.sequence ?? -1) + 1,
      role: "ASSISTANT",
      parts: responseMessage.parts as never,
    },
  });
  await prisma.generation.update({
    where: { id: context.id },
    data: {
      status: isAborted ? "CANCELLED" : "SUCCEEDED",
      finishReason,
      responseMessageId: saved.id,
      durationMs: Date.now() - context.startedAt.getTime(),
      finishedAt: new Date(),
    },
  });
  await prisma.chatSession.update({ where: { id: context.sessionId }, data: { updatedAt: new Date() } });
}

export function failCloudGeneration(context: CloudGenerationContext, error: unknown, isAborted: boolean) {
  return prisma.generation.update({
    where: { id: context.id },
    data: {
      status: isAborted ? "CANCELLED" : "FAILED",
      errorCode: error instanceof Error ? error.message.slice(0, 100) : "GENERATION_FAILED",
      errorMessage: "模型生成失败。",
      durationMs: Date.now() - context.startedAt.getTime(),
      finishedAt: new Date(),
    },
  });
}
