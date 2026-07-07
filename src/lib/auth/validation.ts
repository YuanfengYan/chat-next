import { z } from "zod";

const email = z.string().trim().toLowerCase().pipe(z.email("请输入有效的邮箱地址"));
const password = z.string().min(8, "密码至少需要 8 个字符").max(128, "密码不能超过 128 个字符");

/** 登录表单与服务端共用的输入约束。 */
export const signInSchema = z.object({ email, password });

/** 注册表单与服务端共用的输入约束。 */
export const signUpSchema = z.object({
  name: z.string().trim().min(2, "昵称至少需要 2 个字符").max(100, "昵称不能超过 100 个字符"),
  email,
  password,
});

export type AuthFieldErrors = Partial<Record<"name" | "email" | "password" | "confirmPassword", string>>;
