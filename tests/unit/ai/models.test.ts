import { describe, expect, it } from "vitest";
import { getModelDefinition, isModelId, MODEL_CATALOG } from "@/features/ai/domain/models";
describe("model catalog", () => {
  it("allows only registered models", () => {
    expect(isModelId("deepseek-chat")).toBe(true);
    expect(isModelId("arbitrary-model")).toBe(false);
    expect(getModelDefinition("deepseek-chat")?.provider).toBe("deepseek");
    expect(MODEL_CATALOG).toHaveLength(8);
    expect(new Set(MODEL_CATALOG.map((model) => model.provider))).toEqual(new Set(["deepseek", "openai", "anthropic", "google"]));
  });
});
