import "server-only";
import { prisma } from "@/infrastructure/db/prisma.server";
import { MODEL_CATALOG } from "@/features/ai/domain/models";

const providerNames = { deepseek: "DeepSeek", openai: "OpenAI", anthropic: "Anthropic", google: "Google" } as const;
let syncPromise: Promise<void> | undefined;

/** 幂等同步代码模型目录，为云会话和工具绑定提供稳定的数据库外键。 */
export function ensureModelCatalog() {
  return syncPromise ??= (async () => {
    for (const [key, name] of Object.entries(providerNames)) {
      const provider = await prisma.aiProvider.upsert({ where: { key }, update: {}, create: { key, name } });
      for (const model of MODEL_CATALOG.filter((item) => item.provider === key)) {
        await prisma.model.upsert({
          where: { key: model.id },
          update: { providerId: provider.id, providerModelId: model.id, name: model.name, description: model.description, capabilities: model.capabilities },
          create: { providerId: provider.id, key: model.id, providerModelId: model.id, name: model.name, description: model.description, capabilities: model.capabilities },
        });
      }
    }
  })().catch((error) => { syncPromise = undefined; throw error; });
}

