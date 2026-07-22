import { describe, expect, it } from "vitest";
import { userFacingError } from "@/features/ai/domain/errors";
describe("userFacingError", () => {
  it("extracts a structured API error message", () => {
    expect(userFacingError(new Error(JSON.stringify({ code: "MISSING_API_KEY", message: "尚未配置密钥", retryable: false })))).toBe("尚未配置密钥");
  });
  it("preserves plain SDK errors", () => {
    expect(userFacingError(new Error("网络异常"))).toBe("网络异常");
  });
});
