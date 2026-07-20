import "server-only";
import { tool, type ToolSet } from "ai";
import { z } from "zod";

export interface SkillToolContext { skillId: string; modelId: string; sessionId: string; }
export type SkillLogger = Pick<Console, "info" | "error">;

const implementations = {
  textStatistics: (context: SkillToolContext, logger: SkillLogger) => tool({
    description: "精确统计文本的字符数、非空白字符数、词语数与行数。",
    inputSchema: z.object({ text: z.string().min(1).max(20_000) }),
    execute: async ({ text }) => {
      const startedAt = Date.now();
      logger.info(JSON.stringify({ event: "skill.invoke.start", ...context, toolName: "textStatistics" }));
      try {
        const output = {
          characters: Array.from(text).length,
          nonWhitespaceCharacters: Array.from(text).filter((character) => !/\s/u.test(character)).length,
          words: text.trim() ? text.trim().split(/\s+/u).length : 0,
          lines: text.split(/\r?\n/u).length,
        };
        logger.info(JSON.stringify({ event: "skill.invoke.success", ...context, toolName: "textStatistics", durationMs: Date.now() - startedAt }));
        return output;
      } catch (error) {
        logger.error(JSON.stringify({ event: "skill.invoke.error", ...context, toolName: "textStatistics", durationMs: Date.now() - startedAt, errorCode: error instanceof Error ? error.name : "UNKNOWN_ERROR" }));
        throw error;
      }
    },
  }),
} as const;

export type SkillToolName = keyof typeof implementations;
export const SKILL_TOOL_NAMES = new Set<string>(Object.keys(implementations));

/** 仅从受信任静态注册表创建工具，Skill 文件不能携带可执行代码。 */
export function createSkillTools(toolNames: readonly string[], context: SkillToolContext, logger: SkillLogger = console): ToolSet {
  return Object.fromEntries(toolNames.map((name) => {
    const factory = implementations[name as SkillToolName];
    if (!factory) throw new Error(`UNKNOWN_SKILL_TOOL:${name}`);
    return [name, factory(context, logger)];
  }));
}
