import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL 未配置，无法连接 PostgreSQL。");
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

/** 服务端共享的 Prisma Client；开发热更新时复用连接池，避免连接数不断增长。 */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
