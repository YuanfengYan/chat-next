import "server-only";
/** 服务端模型注册表：校验模型标识，并用私有密钥创建对应的语言模型实例。 */
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import { getModelDefinition } from "@/lib/ai/models";

export function resolveModel(modelId: string): LanguageModel {
  const definition = getModelDefinition(modelId);
  if (!definition) throw new Error("MODEL_NOT_ALLOWED");
  const providers = {
    deepseek: { key: process.env.DEEPSEEK_API_KEY, create: (key: string) => createDeepSeek({ apiKey: key })(modelId) },
    openai: { key: process.env.OPENAI_API_KEY, create: (key: string) => createOpenAI({ apiKey: key })(modelId) },
    anthropic: { key: process.env.ANTHROPIC_API_KEY, create: (key: string) => createAnthropic({ apiKey: key })(modelId) },
    google: { key: process.env.GOOGLE_GENERATIVE_AI_API_KEY, create: (key: string) => createGoogleGenerativeAI({ apiKey: key })(modelId) },
  } satisfies Record<typeof definition.provider, { key: string | undefined; create: (key: string) => LanguageModel }>;
  const provider = providers[definition.provider];
  if (!provider.key) throw new Error(`MISSING_API_KEY:${definition.provider}`);
  return provider.create(provider.key);
}
