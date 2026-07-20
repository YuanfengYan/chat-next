import type { UIMessage } from "ai";
import { z } from "zod";
import { getBrains } from "@/lib/ai/brains.server";
import { apiError } from "@/lib/ai/errors";
import { isModelId } from "@/lib/ai/models";
import { isSkillId } from "@/lib/ai/skills";
import type { ValidatedChatImage } from "@/lib/ai/tools/image-recognition.server";
import { auth } from "@/lib/auth/auth.server";

export const maxDuration = 90;
const requestSchema = z.object({
  id: z.string().min(1).max(128), modelId: z.string().default("deepseek-chat"),
  skillIds: z.array(z.string()).max(5).default([]).transform((ids) => [...new Set(ids)]),
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

    const result = await getBrains().streamChat({ modelId: parsed.data.modelId, skillIds: parsed.data.skillIds, sessionId: parsed.data.id, messages: modelMessages, images, abortSignal: request.signal });
    return result.toUIMessageStreamResponse({ onError: () => "模型服务暂时不可用，请稍后重试。" });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("MISSING_API_KEY:")) return apiError({ code: "MISSING_API_KEY", message: "服务端尚未配置所选模型的 API Key。", retryable: false }, 503);
    if (error instanceof Error && error.message === "SKILL_NOT_ALLOWED") return apiError({ code: "SKILL_NOT_ALLOWED", message: "包含未注册的 Skill。", retryable: false }, 400);
    return apiError({ code: "UPSTREAM_ERROR", message: "服务暂时不可用，请稍后重试。", retryable: true }, 502);
  }
}
