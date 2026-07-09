"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/auth-client";
import { signInSchema, signUpSchema, type AuthFieldErrors } from "@/lib/auth/validation";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "register";

function collectErrors(error: { issues: Array<{ path: PropertyKey[]; message: string }> }): AuthFieldErrors {
  return Object.fromEntries(error.issues.map((issue) => [String(issue.path[0]), issue.message]));
}

/** 登录注册表单：负责客户端校验、提交状态与安全的用户提示。 */
export function AuthForm({ mode, githubEnabled, oauthError = false }: { mode: AuthMode; githubEnabled: boolean; oauthError?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [formError, setFormError] = useState(oauthError ? "GitHub 授权未完成，请重试" : "");

  async function signInWithGitHub() {
    if (pending || !githubEnabled) return;
    setPending(true);
    setFormError("");
    try {
      const result = await authClient.signIn.social({
        provider: "github",
        callbackURL: "/",
        errorCallbackURL: `/auth?mode=${mode}&error=oauth`,
      });
      if (result?.error) {
        setFormError("GitHub 登录暂时不可用，请稍后重试");
        setPending(false);
      }
    } catch {
      setFormError("GitHub 登录暂时不可用，请稍后重试");
      setPending(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = new FormData(event.currentTarget);
    const values = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      confirmPassword: String(form.get("confirmPassword") ?? ""),
      rememberMe: form.get("rememberMe") === "on",
    };
    const parsed = mode === "register" ? signUpSchema.safeParse(values) : signInSchema.safeParse(values);
    const nextErrors: AuthFieldErrors = parsed.success ? {} : collectErrors(parsed.error);
    if (mode === "register" && values.password !== values.confirmPassword) nextErrors.confirmPassword = "两次输入的密码不一致";
    setErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length) return;

    setPending(true);
    try {
      const result = mode === "register"
        ? await authClient.signUp.email({ name: values.name.trim(), email: values.email.trim().toLowerCase(), password: values.password })
        : await authClient.signIn.email({ email: values.email.trim().toLowerCase(), password: values.password, rememberMe: values.rememberMe });

      if (result.error) {
        setFormError(mode === "register" && result.error.status === 422 ? "该邮箱已注册，请直接登录" : "邮箱或密码不正确，请重新输入");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setFormError("网络连接异常，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  const register = mode === "register";
  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <p className="mb-2 text-sm font-medium text-primary">{register ? "创建新账户" : "欢迎回来"}</p>
        <h1 className="text-3xl font-semibold tracking-tight">{register ? "开始使用 DeepChat" : "登录 DeepChat"}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{register ? "创建账户，开启专注而流畅的 AI 对话。" : "继续你的对话、灵感与探索。"}</p>
      </div>

      <div className="mb-7 grid grid-cols-2 rounded-xl bg-muted p-1" aria-label="认证方式">
        <Link href="/auth?mode=login" className={cn("rounded-lg px-3 py-2 text-center text-sm font-medium transition", !register ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>登录</Link>
        <Link href="/auth?mode=register" className={cn("rounded-lg px-3 py-2 text-center text-sm font-medium transition", register ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>注册</Link>
      </div>

      <Button type="button" variant="outline" size="lg" className="w-full" disabled={pending || !githubEnabled} onClick={() => void signInWithGitHub()}>
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <GitHubMark />}
        {githubEnabled ? "使用 GitHub 继续" : "GitHub 登录暂未配置"}
      </Button>
      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" /><span>或使用邮箱</span><span className="h-px flex-1 bg-border" /></div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {register && <Field label="昵称" name="name" error={errors.name}><Input id="name" name="name" autoComplete="name" placeholder="你的昵称" disabled={pending} aria-invalid={Boolean(errors.name)} /></Field>}
        <Field label="邮箱" name="email" error={errors.email}><Input id="email" name="email" type="email" autoComplete="email" placeholder="name@example.com" disabled={pending} aria-invalid={Boolean(errors.email)} /></Field>
        <Field label="密码" name="password" error={errors.password} hint={register ? "使用 8–128 个字符" : undefined}>
          <PasswordInput id="password" name="password" autoComplete={register ? "new-password" : "current-password"} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} disabled={pending} invalid={Boolean(errors.password)} />
        </Field>
        {register && <Field label="确认密码" name="confirmPassword" error={errors.confirmPassword}>
          <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" visible={showConfirmPassword} onToggle={() => setShowConfirmPassword((value) => !value)} disabled={pending} invalid={Boolean(errors.confirmPassword)} />
        </Field>}
        {!register && <label className="flex w-fit items-center gap-2 text-sm text-muted-foreground"><input name="rememberMe" type="checkbox" defaultChecked className="size-4 rounded border-input accent-primary" disabled={pending} />保持登录</label>}

        {formError && <div role="alert" className="rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2.5 text-sm text-destructive">{formError}</div>}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending && <LoaderCircle className="size-4 animate-spin" />}{pending ? "正在处理…" : register ? "创建账户" : "登录"}
        </Button>
      </form>
      <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">继续即表示你同意以负责任的方式使用 DeepChat。</p>
    </div>
  );
}

function Field({ label, name, error, hint, children }: { label: string; name: string; error?: string; hint?: string; children: React.ReactNode }) {
  return <div className="space-y-2"><div className="flex items-center justify-between"><label htmlFor={name} className="text-sm font-medium">{label}</label>{hint && <span className="text-xs text-muted-foreground">{hint}</span>}</div>{children}{error && <p className="text-xs text-destructive">{error}</p>}</div>;
}

function PasswordInput({ visible, onToggle, invalid, ...props }: React.ComponentProps<typeof Input> & { visible: boolean; onToggle: () => void; invalid: boolean }) {
  return <div className="relative"><Input {...props} type={visible ? "text" : "password"} aria-invalid={invalid} className="pr-11" /><button type="button" onClick={onToggle} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition hover:text-foreground" aria-label={visible ? "隐藏密码" : "显示密码"}>{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div>;
}

function GitHubMark() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current"><path d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2.23c-3.22.7-3.9-1.37-3.9-1.37-.52-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.57-.29-5.28-1.29-5.28-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.47.11-3.05 0 0 .97-.31 3.16 1.18a10.9 10.9 0 0 1 5.75 0C17.03 5.1 18 5.41 18 5.41c.63 1.58.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.4-2.71 5.38-5.29 5.67.42.36.79 1.06.79 2.14v3.19c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z" /></svg>;
}
