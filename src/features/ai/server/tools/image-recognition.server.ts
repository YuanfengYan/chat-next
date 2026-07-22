import "server-only";

import { tool } from "ai";
import { z } from "zod";
import type { ImageRecognitionResult, ValidatedChatImage } from "@/features/ai/domain/tool-results";

const TOKEN_URL = "https://aip.baidubce.com/oauth/2.0/token";
const OCR_URL = "https://aip.baidubce.com/rest/2.0/ocr/v1/general";
let tokenCache: { value: string; expiresAt: number } | undefined;

const pointSchema = z.object({ x: z.number(), y: z.number() });
const locationSchema = z.object({ left: z.number(), top: z.number(), width: z.number(), height: z.number() });
const baiduResponseSchema = z.object({
  error_code: z.union([z.number(), z.string()]).optional(), error_msg: z.string().optional(),
  direction: z.number().optional(), language: z.number().optional(), words_result_num: z.number().optional(),
  words_result: z.array(z.object({
    words: z.string().default(""), location: locationSchema,
    probability: z.object({ average: z.number(), variance: z.number(), min: z.number() }).optional(),
    vertexes_location: z.array(pointSchema).optional(),
  })).optional(),
  paragraphs_result: z.array(z.object({ words_result_idx: z.array(z.number().int()).default([]), vertexes_location: z.array(pointSchema).optional() })).optional(),
});

async function getAccessToken(signal?: AbortSignal) {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.value;
  const apiKey = process.env.BAIDU_IMAGE_API_KEY;
  const secretKey = process.env.BAIDU_IMAGE_SECRET_KEY;
  if (!apiKey || !secretKey) throw new Error("服务端尚未配置百度文字识别凭证。");
  const timeout = AbortSignal.timeout(30_000);
  const response = await fetch(`${TOKEN_URL}?grant_type=client_credentials&client_id=${encodeURIComponent(apiKey)}&client_secret=${encodeURIComponent(secretKey)}`, { method: "POST", signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
  const raw: unknown = await response.json().catch(() => null);
  const parsed = z.object({ access_token: z.string(), expires_in: z.number().default(2_592_000) }).safeParse(raw);
  if (!response.ok || !parsed.success) throw new Error("百度文字识别鉴权失败。");
  tokenCache = { value: parsed.data.access_token, expiresAt: Date.now() + parsed.data.expires_in * 1000 };
  return tokenCache.value;
}

/** 调用百度通用文字识别（标准含位置版），并规范化行文字、位置及段落信息。 */
export async function recognizeImages(images: ValidatedChatImage[], indexes: number[], signal?: AbortSignal): Promise<ImageRecognitionResult> {
  const selected = [...new Set(indexes)].map((index) => ({ index, image: images[index] })).filter((item): item is { index: number; image: ValidatedChatImage } => Boolean(item.image)).slice(0, 3);
  if (!selected.length) throw new Error("没有找到可识别的图片，请检查图片序号。");
  const token = await getAccessToken(signal);
  const results = await Promise.all(selected.map(async ({ index, image }) => {
    const body = new URLSearchParams({ image: image.data, language_type: "CHN_ENG", detect_direction: "true", detect_language: "true", paragraph: "true", vertexes_location: "true", probability: "true" });
    const timeout = AbortSignal.timeout(30_000);
    const response = await fetch(`${OCR_URL}?access_token=${encodeURIComponent(token)}`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
    const raw: unknown = await response.json().catch(() => null);
    const parsed = baiduResponseSchema.safeParse(raw);
    if (!response.ok || !parsed.success) throw new Error("百度文字识别返回了无法识别的数据。");
    if (parsed.data.error_code) throw new Error(parsed.data.error_msg || `百度文字识别失败（${parsed.data.error_code}）。`);
    return {
      index, direction: parsed.data.direction, language: parsed.data.language,
      words: (parsed.data.words_result ?? []).slice(0, 200).map((item) => ({ text: item.words, location: item.location, ...(item.probability ? { probability: item.probability } : {}), ...(item.vertexes_location ? { vertices: item.vertexes_location } : {}) })),
      ...(parsed.data.paragraphs_result ? { paragraphs: parsed.data.paragraphs_result.slice(0, 100).map((item) => ({ wordIndexes: item.words_result_idx, ...(item.vertexes_location ? { vertices: item.vertexes_location } : {}) })) } : {}),
    };
  }));
  return { images: results };
}

/** 创建仅能访问当前请求内已校验图片的 OCR 工具。 */
export function createImageRecognitionTool(images: ValidatedChatImage[]) {
  return tool({
    description: `使用百度通用文字识别（标准含位置版）提取用户图片中的文字、行位置、置信度和段落信息。当前共有 ${images.length} 张图片，序号从 0 开始。`,
    inputSchema: z.object({ imageIndexes: z.array(z.number().int().min(0).max(Math.max(0, images.length - 1))).min(1).max(3) }),
    execute: async ({ imageIndexes }, { abortSignal }) => recognizeImages(images, imageIndexes, abortSignal),
  });
}
