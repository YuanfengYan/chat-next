import "server-only";

import { headers } from "next/headers";
import { auth } from "@/features/auth/server/auth.server";

/** 读取并验证当前请求的数据库会话。 */
export async function getCurrentSession() {
  return auth.api.getSession({ headers: await headers() });
}
 