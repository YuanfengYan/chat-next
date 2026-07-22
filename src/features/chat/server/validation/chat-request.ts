import type { UIMessage } from "ai";
import { z } from "zod";
import type { ValidatedChatImage } from "@/features/ai/domain/tool-results";

/** 聊天接口请求上限与稳定输入结构。 */
export const chatRequestSchema = z.object({
  id: z.string().min(1).max(128),
  modelId: z.string().default("deepseek-chat"),
  skillIds: z.array(z.string()).max(5).default([]).transform((ids) => [...new Set(ids)]),
  persistence: z.enum(["local", "cloud"]).default("local"),
  messages: z.array(z.object({
    id: z.string(),
    role: z.enum(["system", "user", "assistant"]),
    parts: z.array(z.object({ type: z.string() }).passthrough()),
  }).passthrough()).min(1).max(100),
});

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/bmp"]);
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/** 校验 data URL、声明类型、文件大小和魔数，拒绝伪造图片。 */
export function decodeChatImage(part: UIMessage["parts"][number]): ValidatedChatImage | null {
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
