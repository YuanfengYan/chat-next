import { afterEach, describe, expect, it } from "vitest";
import { resolveModel } from "@/lib/ai/provider-registry.server";

const originalEnv = { ...process.env };
afterEach(() => { process.env = { ...originalEnv }; });

describe("provider registry", () => {
  it("rejects unknown models and reports the missing provider credential", () => {
    expect(() => resolveModel("unknown")).toThrow("MODEL_NOT_ALLOWED");
    delete process.env.OPENAI_API_KEY;
    expect(() => resolveModel("gpt-5")).toThrow("MISSING_API_KEY:openai");
  });

  it.each([
    ["deepseek-chat", "DEEPSEEK_API_KEY"], ["gpt-5", "OPENAI_API_KEY"],
    ["claude-sonnet-4-5", "ANTHROPIC_API_KEY"], ["gemini-2.5-pro", "GOOGLE_GENERATIVE_AI_API_KEY"],
  ])("creates %s through its provider", (modelId, variable) => {
    process.env[variable] = "test-key";
    expect(resolveModel(modelId)).toBeDefined();
  });
});
