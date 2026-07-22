import { describe, expect, it } from "vitest";
import { validateJsonSchemaValue } from "@/features/ai/server/tools/json-schema.server";

describe("validateJsonSchemaValue", () => {
  const schema = { type: "object", properties: { query: { type: "string", minLength: 2 }, limit: { type: "integer", minimum: 1, maximum: 10 } }, required: ["query"], additionalProperties: false };

  it("accepts a matching tool input", () => {
    expect(validateJsonSchemaValue(schema, { query: "天气", limit: 3 })).toEqual([]);
  });

  it("reports missing, invalid and unknown fields", () => {
    expect(validateJsonSchemaValue(schema, { limit: 99, secret: true }).join("；")).toContain("query");
    expect(validateJsonSchemaValue(schema, { limit: 99, secret: true }).join("；")).toContain("超过最大值");
    expect(validateJsonSchemaValue(schema, { limit: 99, secret: true }).join("；")).toContain("不允许出现");
  });
});

