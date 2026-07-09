import { redirect } from "next/navigation";
import { AdminAccessDenied } from "@/features/admin/components/admin-access-denied";
import { AdminLoginForm } from "@/features/admin/components/admin-login-form";
import { getAdminViewer } from "@/lib/admin/auth.server";

/** 后台独立登录页：与前台 /auth 分离，登录成功后只进入后台权限校验链路。 */
export default async function AdminLoginPage() {
  const viewer = await getAdminViewer();
  if (viewer?.isAdmin) redirect("/admin");
  if (viewer) return <AdminAccessDenied viewer={viewer} />;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/30 px-5 py-10">
      <AdminLoginForm />
    </main>
  );
}
