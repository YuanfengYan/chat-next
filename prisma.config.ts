import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Prisma CLI 在 Next.js 运行时之外执行，需要显式加载根目录的 .env.local。
loadEnv({ path: ".env.local", quiet: true });
loadEnv({ quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
