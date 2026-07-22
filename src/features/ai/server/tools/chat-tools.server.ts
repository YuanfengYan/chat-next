import "server-only";
import type { ValidatedChatImage } from "@/features/ai/domain/tool-results";
import { createImageRecognitionTool } from "@/features/ai/server/tools/image-recognition.server";
import { webSearchTool } from "@/features/ai/server/tools/web-search.server";

/** 为单次聊天请求创建工具白名单。 */
export function createChatTools(images: ValidatedChatImage[]) {
  return { webSearch: webSearchTool, imageRecognition: createImageRecognitionTool(images) };
}
