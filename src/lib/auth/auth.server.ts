import "server-only";

import { APIError, betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/db/prisma.server";
import { signInSchema, signUpSchema } from "@/lib/auth/validation";

/** 服务端认证实例：统一管理邮箱密码、数据库会话与认证安全策略。 */
export const auth = betterAuth({
  appName: "DeepChat",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  basePath: "/api/auth",
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  user: {
    modelName: "User",
    fields: {
      name: "displayName",
      image: "avatarUrl",
    },
  },
  session: {
    modelName: "AuthSession",
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  account: { modelName: "Account" }, 
  verification: { modelName: "Verification" },
  advanced: {
    database: { generateId: "uuid" },
  },
  hooks: {
    before: createAuthMiddleware(async (context) => {
      if (context.path === "/sign-up/email") {
        const parsed = signUpSchema.safeParse(context.body);
        if (!parsed.success) throw APIError.from("BAD_REQUEST", { code: "INVALID_SIGN_UP", message: "注册信息不符合要求" });
        Object.assign(context.body, parsed.data);
        return;
      }

      if (context.path !== "/sign-in/email") return;
      const parsed = signInSchema.safeParse(context.body);
      if (!parsed.success) throw APIError.from("UNAUTHORIZED", { code: "INVALID_CREDENTIALS", message: "邮箱或密码不正确" });
      Object.assign(context.body, parsed.data);
      const { email } = parsed.data;

      const user = await prisma.user.findUnique({ where: { email }, select: { status: true } });
      if (user?.status === "DISABLED") {
        throw APIError.from("UNAUTHORIZED", { code: "INVALID_CREDENTIALS", message: "邮箱或密码不正确" });
      }
    }),
  },
});

export type AuthSession = typeof auth.$Infer.Session;
