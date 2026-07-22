import { toUIMessageStream, type UIMessage } from "ai";
import { getBrains } from "@/features/ai/server/orchestration/brains.server";
import { apiError } from "@/features/ai/domain/errors";
import { isModelId } from "@/features/ai/domain/models";
import { isSkillId } from "@/features/ai/domain/skills";
import type { ValidatedChatImage } from "@/features/ai/domain/tool-results";
import { auth } from "@/features/auth/server/auth.server";
import { createCustomSseStream, customSseResponse } from "@/features/ai/server/streaming/chat-sse.server";
import {
  completeCloudGeneration,
  failCloudGeneration,
  startCloudGeneration,
  updateGenerationTools,
  type CloudGenerationContext,
} from "@/features/chat/server/services/cloud-generation.service.server";
import { chatRequestSchema, decodeChatImage } from "@/features/chat/server/validation/chat-request";

/** 聊天服务端入口：校验请求、绑定本次图片工具并返回流式消息。 */
export async function handleChatRequest(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return apiError({ code: "AUTH_REQUIRED", message: "登录状态已失效，请重新登录。", retryable: false }, 401);
    const json: unknown = await request.json();
    if (JSON.stringify(json).length > 18_000_000) return apiError({ code: "INVALID_REQUEST", message: "对话内容过长。", retryable: false }, 413);
    const parsed = chatRequestSchema.safeParse(json);
    if (!parsed.success) return apiError({ code: "INVALID_REQUEST", message: "请求格式无效。", retryable: false }, 400);
    if (!isModelId(parsed.data.modelId)) return apiError({ code: "MODEL_NOT_ALLOWED", message: "不支持该模型。", retryable: false }, 400);
    if (parsed.data.skillIds.some((id) => !isSkillId(id))) return apiError({ code: "SKILL_NOT_ALLOWED", message: "包含未注册的 Skill。", retryable: false }, 400);

    const messages = parsed.data.messages as UIMessage[];
    const lastUser = [...messages].reverse().find((message) => message.role === "user");
    const fileParts = lastUser?.parts.filter((part) => part.type === "file") ?? [];
    if (fileParts.length > 3) return apiError({ code: "INVALID_REQUEST", message: "每条消息最多上传 3 张图片。", retryable: false }, 413);
    const decoded = fileParts.map(decodeChatImage);
    if (decoded.some((image) => !image)) return apiError({ code: "INVALID_REQUEST", message: "图片格式、内容或大小无效。", retryable: false }, 400);
    const images = decoded as ValidatedChatImage[];
    const modelMessages = messages.map((message) => ({ ...message, parts: message.parts.filter((part) => part.type !== "file") })) as UIMessage[];
    if (lastUser && images.length) modelMessages.find((message) => message.id === lastUser.id)?.parts.push({ type: "text", text: `\n[用户上传了 ${images.length} 张图片，可使用 imageRecognition 工具按序号识别。]` });

    let generation: CloudGenerationContext | undefined;
    if (parsed.data.persistence === "cloud") {
      generation = await startCloudGeneration({
        userId: session.user.id,
        sessionId: parsed.data.id,
        modelId: parsed.data.modelId,
        skillIds: parsed.data.skillIds,
        messages: modelMessages,
      });
    }

    try {
      const streamed = await getBrains().streamChat({ modelId: parsed.data.modelId, skillIds: parsed.data.skillIds, sessionId: parsed.data.id, userId: generation ? session.user.id : undefined, generationId: generation?.id, messages: modelMessages, images, abortSignal: request.signal });
      if (generation) await updateGenerationTools(generation, parsed.data.modelId, parsed.data.skillIds, streamed.toolSnapshot);
      const uiStream = toUIMessageStream({
        stream: streamed.result.stream,
        originalMessages: modelMessages,
        onError: () => "模型服务暂时不可用，请稍后重试。",
        onEnd: async ({ responseMessage, finishReason, isAborted }) => {
          if (!generation) return;
          await completeCloudGeneration(generation, responseMessage, finishReason, isAborted);
        },
      });
      const [clientStream, persistenceStream] = uiStream.tee();
      void (async () => { const reader = persistenceStream.getReader(); try { while (!(await reader.read()).done) { /* 持续消费以保证断开后的收尾回调。 */ } } finally { reader.releaseLock(); } })();
      return customSseResponse(createCustomSseStream(clientStream, generation?.id));
    } catch (error) {
      if (generation) await failCloudGeneration(generation, error, request.signal.aborted);
      throw error;
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("MISSING_API_KEY:")) return apiError({ code: "MISSING_API_KEY", message: "服务端尚未配置所选模型的 API Key。", retryable: false }, 503);
    if (error instanceof Error && error.message === "SKILL_NOT_ALLOWED") return apiError({ code: "SKILL_NOT_ALLOWED", message: "包含未注册的 Skill。", retryable: false }, 400);
    if (error instanceof Error && error.message === "SESSION_NOT_FOUND") return apiError({ code: "SESSION_NOT_FOUND", message: "云端会话不存在。", retryable: false }, 404);
    if (error instanceof Error && error.message === "MODEL_MISMATCH") return apiError({ code: "MODEL_MISMATCH", message: "会话模型配置已变化，请刷新后重试。", retryable: true }, 409);
    return apiError({ code: "UPSTREAM_ERROR", message: "服务暂时不可用，请稍后重试。", retryable: true }, 502);
  }
}
