import "server-only";
import { createImageRecognitionTool, type ValidatedChatImage } from "@/lib/ai/tools/image-recognition.server";
import { webSearchTool } from "@/lib/ai/tools/web-search.server";

/** 为单次聊天请求创建工具白名单。 */
export function createChatTools(images: ValidatedChatImage[]) {
  return { webSearch: webSearchTool, imageRecognition: createImageRecognitionTool(images) };
}
