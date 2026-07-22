import { redirect } from "next/navigation";
import { getCurrentSession } from "@/features/auth/server/session.server";
import { HomeLauncher } from "./home-launcher";

/** 应用入口：先验证会话，再由浏览器恢复本地对话。 */
export default async function HomePage() {
  if (!await getCurrentSession()) redirect("/auth");
  return <HomeLauncher />;
}
