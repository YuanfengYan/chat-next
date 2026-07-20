/** 可安全暴露给客户端的 Skill 元数据；指令正文与工具实现仅存在于服务端。 */
export interface SkillDefinition { id: string; name: string; description: string; }

export const SKILL_CATALOG = [
  { id: "text-analysis", name: "文本分析", description: "统计并概括文本的结构与关键特征" },
] as const satisfies readonly SkillDefinition[];

export type SkillId = (typeof SKILL_CATALOG)[number]["id"];
export function isSkillId(value: string): value is SkillId { return SKILL_CATALOG.some((skill) => skill.id === value); }
