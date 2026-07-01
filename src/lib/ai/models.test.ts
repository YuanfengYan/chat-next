import { describe, expect, it } from "vitest";
import { getModelDefinition, isModelId } from "@/lib/ai/models";
describe("model catalog", () => {
  it("allows only registered models", () => {
    expect(isModelId("deepseek-chat")).toBe(true);
    expect(isModelId("arbitrary-model")).toBe(false);
    expect(getModelDefinition("deepseek-chat")?.provider).toBe("deepseek");
  });
});
