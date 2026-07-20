import "server-only";
import { convertToModelMessages, stepCountIs, streamText, type ToolSet, type UIMessage } from "ai";
import { MODEL_CATALOG } from "@/lib/ai/models";
import { resolveModel } from "@/lib/ai/provider-registry.server";
import { SKILL_CATALOG } from "@/lib/ai/skills";
import { SkillLoader } from "@/lib/ai/skills/skill-loader.server";
import { createSkillTools, type SkillLogger } from "@/lib/ai/skills/skill-tools.server";
import { createChatTools } from "@/lib/ai/tools/chat-tools.server";
import type { ValidatedChatImage } from "@/lib/ai/tools/image-recognition.server";

const BASE_SYSTEM_PROMPT = "你是严谨的 AI 助手。需要实时信息时调用 webSearch；用户要求读取、提取或定位上传图片中的文字时调用 imageRecognition。必须基于工具结果回答，不要编造信息或来源。";
export interface StreamChatInput { modelId: string; skillIds: readonly string[]; sessionId: string; messages: UIMessage[]; images: ValidatedChatImage[]; abortSignal?: AbortSignal; }

/** 服务端 AI 编排入口，统一模型、Skill 指令和工具白名单。 */
export class Brains {
  constructor(private readonly skillLoader = new SkillLoader(), private readonly logger: SkillLogger = console) {}
  listModels() { return MODEL_CATALOG; }
  listSkills() { return SKILL_CATALOG; }
  resolveModel(modelId: string) { return resolveModel(modelId); }

  async streamChat(input: StreamChatInput) {
    const allSkills = await this.skillLoader.loadAll();
    const requested = new Set(input.skillIds);
    const selected = allSkills.filter((skill) => requested.has(skill.id));
    if (selected.length !== requested.size) throw new Error("SKILL_NOT_ALLOWED");

    const baseTools = createChatTools(input.images) as ToolSet;
    const skillTools: ToolSet = {};
    for (const skill of selected) {
      const next = createSkillTools(skill.tools, { skillId: skill.id, modelId: input.modelId, sessionId: input.sessionId }, this.logger);
      for (const [name, implementation] of Object.entries(next)) {
        if (name in baseTools || name in skillTools) throw new Error(`DUPLICATE_TOOL_NAME:${name}`);
        skillTools[name] = implementation;
      }
    }
    const tools = { ...baseTools, ...skillTools };
    const skillInstructions = selected.map((skill) => `\n\n[Skill: ${skill.name}]\n${skill.instructions}`).join("");
    return streamText({
      model: this.resolveModel(input.modelId),
      system: `${BASE_SYSTEM_PROMPT}${skillInstructions}`,
      messages: await convertToModelMessages(input.messages, { tools, ignoreIncompleteToolCalls: true }),
      tools,
      stopWhen: stepCountIs(4),
      abortSignal: input.abortSignal,
    });
  }
}

const globalBrains = globalThis as typeof globalThis & { __chatbotBrains?: Brains };
/** 开发热更新与生产进程内均复用同一个 Brains 实例。 */
export function getBrains() { return globalBrains.__chatbotBrains ??= new Brains(); }
