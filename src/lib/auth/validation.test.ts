import { describe, expect, it } from "vitest";
import { signInSchema, signUpSchema } from "@/lib/auth/validation";

describe("认证输入校验", () => {
  it("规范化邮箱并接受有效注册信息", () => {
    const result = signUpSchema.parse({ name: " 小明 ", email: " USER@Example.COM ", password: "password123" });
    expect(result).toEqual({ name: "小明", email: "user@example.com", password: "password123" });
  });

  it("拒绝无效邮箱、过短昵称与密码", () => {
    expect(signUpSchema.safeParse({ name: "A", email: "bad", password: "123" }).success).toBe(false);
    expect(signInSchema.safeParse({ email: "bad", password: "123" }).success).toBe(false);
  });

  it("拒绝超过上限的密码", () => {
    expect(signInSchema.safeParse({ email: "user@example.com", password: "x".repeat(129) }).success).toBe(false);
  });
});
