import { redirect } from "next/navigation";
import { HomeLauncher } from "@/app/home-launcher";
import { getCurrentSession } from "@/lib/auth/session.server";

/** 应用入口：先验证会话，再由浏览器恢复本地对话。 */
export default async function HomePage() {
  if (!await getCurrentSession()) redirect("/auth");
  return <HomeLauncher />;
}
