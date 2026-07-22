import { describe, expect, it } from "vitest";
import { getBrains } from "@/features/ai/server/orchestration/brains.server";

describe("Brains singleton", () => {
  it("reuses one server process instance and exposes safe catalogs", () => {
    expect(getBrains()).toBe(getBrains());
    expect(getBrains().listModels()).toHaveLength(8);
    expect(getBrains().listSkills()).toEqual([expect.objectContaining({ id: "text-analysis" })]);
  });
});
