import { describe, expect, it } from "vitest";
import { parseSkillMarkdown } from "@/features/ai/server/skills/skill-loader.server";

describe("SkillLoader", () => {
  it("parses validated instructions and static tool bindings", () => {
    expect(parseSkillMarkdown("---\nid: text-analysis\nname: 文本分析\ndescription: 示例\ntools: [textStatistics]\n---\n请分析文本。")).toEqual({
      id: "text-analysis", name: "文本分析", description: "示例", tools: ["textStatistics"], instructions: "请分析文本。",
    });
  });

  it("rejects malformed markdown and unknown executable tools", () => {
    expect(() => parseSkillMarkdown("no frontmatter")).toThrow("INVALID_SKILL_MARKDOWN");
    expect(() => parseSkillMarkdown("---\nid: unsafe\nname: 不安全\ndescription: 示例\ntools: [runCode]\n---\n执行代码。")).toThrow("UNKNOWN_SKILL_TOOL");
  });
});
