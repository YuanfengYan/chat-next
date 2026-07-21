import { toUIMessageStream, type UIMessage } from "ai";
import { z } from "zod";
import { getBrains } from "@/lib/ai/brains.server";
import { apiError } from "@/lib/ai/errors";
import { isModelId } from "@/lib/ai/models";
import { isSkillId } from "@/lib/ai/skills";
import type { ValidatedChatImage } from "@/lib/ai/tools/image-recognition.server";
import { auth } from "@/lib/auth/auth.server";
import { prisma } from "@/lib/db/prisma.server";
import { ensureModelCatalog } from "@/lib/ai/model-catalog.server";
import { createCustomSseStream, customSseResponse } from "@/lib/ai/chat-sse.server";

export const maxDuration = 90;
const requestSchema = z.object({
  id: z.string().min(1).max(128), modelId: z.string().default("deepseek-chat"),
  skillIds: z.array(z.string()).max(5).default([]).transform((ids) => [...new Set(ids)]),
  persistence: z.enum(["local", "cloud"]).default("local"),
  messages: z.array(z.object({ id: z.string(), role: z.enum(["system", "user", "assistant"]), parts: z.array(z.object({ type: z.string() }).passthrough()) }).passthrough()).min(1).max(100),
});
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/bmp"]);
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function decodeImagePart(part: UIMessage["parts"][number]): ValidatedChatImage | null {
  if (part.type !== "file" || !ALLOWED_IMAGE_TYPES.has(part.mediaType) || !part.url.startsWith("data:")) return null;
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=]+)$/.exec(part.url);
  if (!match || match[1] !== part.mediaType) return null;
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES || bytes.toString("base64").replace(/=+$/, "") !== match[2].replace(/=+$/, "")) return null;
  const validMagic = part.mediaType === "image/jpeg"
    ? bytes[0] === 0xff && bytes[1] === 0xd8
    : part.mediaType === "image/png"
      ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : bytes.subarray(0, 2).toString("ascii") === "BM";
  return validMagic ? { data: match[2], mediaType: part.mediaType, filename: part.filename } : null;
}

/** 聊天服务端入口：校验请求、绑定本次图片工具并返回流式消息。 */
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return apiError({ code: "AUTH_REQUIRED", message: "登录状态已失效，请重新登录。", retryable: false }, 401);
    const json: unknown = await request.json();
    if (JSON.stringify(json).length > 18_000_000) return apiError({ code: "INVALID_REQUEST", message: "对话内容过长。", retryable: false }, 413);
    const parsed = requestSchema.safeParse(json);
    if (!parsed.success) return apiError({ code: "INVALID_REQUEST", message: "请求格式无效。", retryable: false }, 400);
    if (!isModelId(parsed.data.modelId)) return apiError({ code: "MODEL_NOT_ALLOWED", message: "不支持该模型。", retryable: false }, 400);
    if (parsed.data.skillIds.some((id) => !isSkillId(id))) return apiError({ code: "SKILL_NOT_ALLOWED", message: "包含未注册的 Skill。", retryable: false }, 400);

    const messages = parsed.data.messages as UIMessage[];
    const lastUser = [...messages].reverse().find((message) => message.role === "user");
    const fileParts = lastUser?.parts.filter((part) => part.type === "file") ?? [];
    if (fileParts.length > 3) return apiError({ code: "INVALID_REQUEST", message: "每条消息最多上传 3 张图片。", retryable: false }, 413);
    const decoded = fileParts.map(decodeImagePart);
    if (decoded.some((image) => !image)) return apiError({ code: "INVALID_REQUEST", message: "图片格式、内容或大小无效。", retryable: false }, 400);
    const images = decoded as ValidatedChatImage[];
    const modelMessages = messages.map((message) => ({ ...message, parts: message.parts.filter((part) => part.type !== "file") })) as UIMessage[];
    if (lastUser && images.length) modelMessages.find((message) => message.id === lastUser.id)?.parts.push({ type: "text", text: `\n[用户上传了 ${images.length} 张图片，可使用 imageRecognition 工具按序号识别。]` });

    let generation: { id: string; startedAt: Date } | undefined;
    if (parsed.data.persistence === "cloud") {
      await ensureModelCatalog();
      const cloudSession = await prisma.chatSession.findFirst({ where: { id: parsed.data.id, userId: session.user.id, deletedAt: null }, include: { model: { select: { key: true } } } });
      if (!cloudSession) return apiError({ code: "SESSION_NOT_FOUND", message: "云端会话不存在。", retryable: false }, 404);
      if (cloudSession.model.key !== parsed.data.modelId) return apiError({ code: "MODEL_MISMATCH", message: "会话模型配置已变化，请刷新后重试。", retryable: true }, 409);
      const lastUserMessage = [...modelMessages].reverse().find((message) => message.role === "user");
      if (lastUserMessage) {
        const existing = await prisma.chatMessage.findUnique({ where: { sessionId_externalId: { sessionId: cloudSession.id, externalId: lastUserMessage.id } }, select: { id: true } });
        if (existing) await prisma.chatMessage.update({ where: { id: existing.id }, data: { parts: lastUserMessage.parts as never } });
        else {
          const aggregate = await prisma.chatMessage.aggregate({ where: { sessionId: cloudSession.id }, _max: { sequence: true } });
          await prisma.chatMessage.create({ data: { sessionId: cloudSession.id, externalId: lastUserMessage.id, sequence: (aggregate._max.sequence ?? -1) + 1, role: "USER", parts: lastUserMessage.parts as never } });
        }
      }
      const created = await prisma.generation.create({ data: { sessionId: cloudSession.id, modelId: cloudSession.modelId, status: "RUNNING", startedAt: new Date(), configSnapshot: { modelId: parsed.data.modelId, skillIds: parsed.data.skillIds } } });
      generation = { id: created.id, startedAt: created.startedAt ?? new Date() };
    }

    try {
      const streamed = await getBrains().streamChat({ modelId: parsed.data.modelId, skillIds: parsed.data.skillIds, sessionId: parsed.data.id, userId: generation ? session.user.id : undefined, generationId: generation?.id, messages: modelMessages, images, abortSignal: request.signal });
      if (generation) await prisma.generation.update({ where: { id: generation.id }, data: { configSnapshot: { modelId: parsed.data.modelId, skillIds: parsed.data.skillIds, tools: streamed.toolSnapshot } } });
      const uiStream = toUIMessageStream({
        stream: streamed.result.stream,
        originalMessages: modelMessages,
        onError: () => "模型服务暂时不可用，请稍后重试。",
        onEnd: async ({ responseMessage, finishReason, isAborted }) => {
          if (!generation) return;
          const aggregate = await prisma.chatMessage.aggregate({ where: { sessionId: parsed.data.id }, _max: { sequence: true } });
          const saved = await prisma.chatMessage.upsert({
            where: { sessionId_externalId: { sessionId: parsed.data.id, externalId: responseMessage.id } },
            update: { parts: responseMessage.parts as never },
            create: { sessionId: parsed.data.id, externalId: responseMessage.id, sequence: (aggregate._max.sequence ?? -1) + 1, role: "ASSISTANT", parts: responseMessage.parts as never },
          });
          await prisma.generation.update({ where: { id: generation.id }, data: { status: isAborted ? "CANCELLED" : "SUCCEEDED", finishReason, responseMessageId: saved.id, durationMs: Date.now() - generation.startedAt.getTime(), finishedAt: new Date() } });
          await prisma.chatSession.update({ where: { id: parsed.data.id }, data: { updatedAt: new Date() } });
        },
      });
      const [clientStream, persistenceStream] = uiStream.tee();
      void (async () => { const reader = persistenceStream.getReader(); try { while (!(await reader.read()).done) { /* 持续消费以保证断开后的收尾回调。 */ } } finally { reader.releaseLock(); } })();
      return customSseResponse(createCustomSseStream(clientStream, generation?.id));
    } catch (error) {
      if (generation) await prisma.generation.update({ where: { id: generation.id }, data: { status: request.signal.aborted ? "CANCELLED" : "FAILED", errorCode: error instanceof Error ? error.message.slice(0, 100) : "GENERATION_FAILED", errorMessage: "模型生成失败。", durationMs: Date.now() - generation.startedAt.getTime(), finishedAt: new Date() } });
      throw error;
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("MISSING_API_KEY:")) return apiError({ code: "MISSING_API_KEY", message: "服务端尚未配置所选模型的 API Key。", retryable: false }, 503);
    if (error instanceof Error && error.message === "SKILL_NOT_ALLOWED") return apiError({ code: "SKILL_NOT_ALLOWED", message: "包含未注册的 Skill。", retryable: false }, 400);
    return apiError({ code: "UPSTREAM_ERROR", message: "服务暂时不可用，请稍后重试。", retryable: true }, 502);
  }
}
