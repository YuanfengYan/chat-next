import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Bot, BrainCircuit, ShieldCheck, Sparkles } from "lucide-react";
import { AuthForm } from "@/features/auth/components/auth-form";
import { getCurrentSession } from "@/features/auth/server/session.server";

export const metadata: Metadata = { title: "登录 | DeepChat", description: "登录或注册 DeepChat" };

/** 认证入口页：服务端处理会话重定向，客户端表单负责交互。 */
export default async function AuthPage({ searchParams }: { searchParams: Promise<{ mode?: string; error?: string }> }) {
  if (await getCurrentSession()) redirect("/");
  const query = await searchParams;
  const mode = query.mode === "register" ? "register" : "login";
  const githubEnabled = Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);

  return (
    <main className="grid min-h-dvh bg-background lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-[#0b1530] px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(74,123,255,0.34),transparent_34%),radial-gradient(circle_at_80%_75%,rgba(72,209,204,0.16),transparent_30%)]" />
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="relative flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-white/12 ring-1 ring-white/15"><Sparkles className="size-5 text-blue-300" /></span><span className="text-lg font-semibold tracking-tight">DeepChat</span></div>
        <div className="relative max-w-xl py-16">
          <p className="mb-5 text-sm font-medium tracking-[0.22em] text-blue-300 uppercase">Think deeper · Create faster</p>
          <h2 className="text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">让每一次对话，<br />都更接近答案。</h2>
          <p className="mt-6 max-w-lg text-base leading-8 text-blue-100/70">一个安静、专注且可扩展的 AI 工作台。保留上下文，梳理复杂问题，把零散灵感变成清晰成果。</p>
          <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
            <Feature icon={BrainCircuit} text="深度思考" /><Feature icon={Bot} text="流畅对话" /><Feature icon={ShieldCheck} text="安全会话" />
          </div>
        </div>
        <p className="relative text-xs text-blue-100/45">© 2026 DeepChat · 为清晰思考而设计</p>
      </section>
      <section className="relative flex items-center justify-center px-5 py-10 sm:px-10 lg:px-16">
        <div className="absolute left-5 top-5 flex items-center gap-2 lg:hidden"><span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Sparkles className="size-4" /></span><span className="font-semibold">DeepChat</span></div>
        <AuthForm key={mode} mode={mode} githubEnabled={githubEnabled} oauthError={Boolean(query.error)} />
      </section>
    </main>
  );
}

function Feature({ icon: Icon, text }: { icon: typeof Bot; text: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/6 px-3 py-4 backdrop-blur"><Icon className="mb-3 size-5 text-blue-300" /><span className="text-sm text-blue-50/80">{text}</span></div>;
}
