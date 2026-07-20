import { describe, expect, it } from "vitest";
import { getBrains } from "@/lib/ai/brains.server";

describe("Brains singleton", () => {
  it("reuses one server process instance and exposes safe catalogs", () => {
    expect(getBrains()).toBe(getBrains());
    expect(getBrains().listModels()).toHaveLength(8);
    expect(getBrains().listSkills()).toEqual([expect.objectContaining({ id: "text-analysis" })]);
  });
});
