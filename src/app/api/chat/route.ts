import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
/** 聊天服务端入口：校验请求、装配模型与工具，并返回 AI SDK 流式消息。 */
import { z } from "zod";
import { apiError } from "@/lib/ai/errors";
import { isModelId } from "@/lib/ai/models";
import { resolveModel } from "@/lib/ai/provider-registry.server";
import { chatTools } from "@/lib/ai/tools/web-search.server";
import { auth } from "@/lib/auth/auth.server";

export const maxDuration = 90;
const requestSchema = z.object({
  id: z.string().min(1).max(128),
  modelId: z.string().default("deepseek-chat"),
  messages: z.array(z.object({ id: z.string(), role: z.enum(["system", "user", "assistant"]), parts: z.array(z.object({ type: z.string() }).passthrough()) }).passthrough()).min(1).max(100),
});

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return apiError({ code: "AUTH_REQUIRED", message: "登录状态已失效，请重新登录。", retryable: false }, 401);
    const json: unknown = await request.json();
    if (JSON.stringify(json).length > 500_000) return apiError({ code: "INVALID_REQUEST", message: "对话内容过长。", retryable: false }, 413);
    const parsed = requestSchema.safeParse(json);
    if (!parsed.success) return apiError({ code: "INVALID_REQUEST", message: "请求格式无效。", retryable: false }, 400);
    if (!isModelId(parsed.data.modelId)) return apiError({ code: "MODEL_NOT_ALLOWED", message: "不支持该模型。", retryable: false }, 400);

    const result = streamText({
      model: resolveModel(parsed.data.modelId),
      system: "你是严谨的 AI 助手。需要实时或可能变化的信息时调用 webSearch；基于搜索结果回答时使用 Markdown 链接标明来源，不要编造来源。无需实时信息时直接回答。",
      messages: await convertToModelMessages(parsed.data.messages as UIMessage[], { tools: chatTools, ignoreIncompleteToolCalls: true }),
      tools: chatTools,
      stopWhen: stepCountIs(4),
      abortSignal: request.signal,
    });
    return result.toUIMessageStreamResponse({
      onError: (error) => error instanceof Error ? error.message : "DeepSeek 暂时不可用，请稍后重试。",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "MISSING_API_KEY") return apiError({ code: "MISSING_API_KEY", message: "服务端尚未配置 DeepSeek API Key。", retryable: false }, 503);
    if (error instanceof Error && error.message === "MODEL_NOT_ALLOWED") return apiError({ code: "MODEL_NOT_ALLOWED", message: "不支持该模型。", retryable: false }, 400);
    return apiError({ code: "UPSTREAM_ERROR", message: "DeepSeek 暂时不可用，请稍后重试。", retryable: true }, 502);
  }
}
