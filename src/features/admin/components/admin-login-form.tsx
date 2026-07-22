"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { authClient } from "@/features/auth/client/auth-client";
import { signInSchema } from "@/features/auth/domain/validation";

/** 后台独立登录表单：复用账号体系，登录后由后台服务端权限守卫继续校验管理员身份。 */
export function AdminLoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = new FormData(event.currentTarget);
    const values = {
      email: String(form.get("email") ?? "").trim().toLowerCase(),
      password: String(form.get("password") ?? ""),
      rememberMe: true,
    };
    const parsed = signInSchema.safeParse(values);
    if (!parsed.success) {
      setError("请输入有效的管理员邮箱和密码。");
      return;
    }

    setPending(true);
    setError("");
    try {
      const result = await authClient.signIn.email(parsed.data);
      if (result.error) {
        setError("邮箱或密码不正确，或账号已被禁用。");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("网络连接异常，请稍后重试。");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-md border bg-card p-6 shadow-sm">
      <div className="mb-6">
        <span className="mb-4 flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ShieldCheck className="size-5" />
        </span>
        <p className="text-sm font-medium text-primary">DeepChat Admin</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">登录后台管理</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">后台使用独立入口。登录后会校验管理员角色或 ADMIN_EMAILS 白名单。</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <label className="block space-y-2">
          <span className="text-sm font-medium">管理员邮箱</span>
          <Input name="email" type="email" autoComplete="email" placeholder="admin@example.com" disabled={pending} />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">密码</span>
          <Input name="password" type="password" autoComplete="current-password" disabled={pending} />
        </label>
        {error && <div role="alert" className="rounded-md border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive">{error}</div>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <LoaderCircle className="size-4 animate-spin" />}
          {pending ? "正在登录..." : "进入后台"}
        </Button>
      </form>
    </div>
  );
}
