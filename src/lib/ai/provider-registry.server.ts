import "server-only";
/** 服务端模型注册表：校验模型标识，并用私有密钥创建对应的语言模型实例。 */
import { createDeepSeek } from "@ai-sdk/deepseek";
import type { LanguageModel } from "ai";
import { isModelId } from "@/lib/ai/models";

export function resolveModel(modelId: string): LanguageModel {
  if (!isModelId(modelId)) throw new Error("MODEL_NOT_ALLOWED");
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("MISSING_API_KEY");
  return createDeepSeek({ apiKey })(modelId);
}
