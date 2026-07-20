import { describe, expect, it, vi } from "vitest";
import { createSkillTools } from "@/lib/ai/skills/skill-tools.server";

describe("skill tool logging", () => {
  it("logs invocation metadata without input content", async () => {
    const logger = { info: vi.fn(), error: vi.fn() };
    const tools = createSkillTools(["textStatistics"], { skillId: "text-analysis", modelId: "deepseek-chat", sessionId: "session-1" }, logger);
    const executable = tools.textStatistics as unknown as { execute: (input: { text: string }) => Promise<unknown> };
    await expect(executable.execute({ text: "sensitive text" })).resolves.toEqual(expect.objectContaining({ characters: 14, words: 2 }));
    const logs = logger.info.mock.calls.flat().join("\n");
    expect(logs).toContain("skill.invoke.start");
    expect(logs).toContain("skill.invoke.success");
    expect(logs).toContain("session-1");
    expect(logs).not.toContain("sensitive text");
    expect(logger.error).not.toHaveBeenCalled();
  });
});
