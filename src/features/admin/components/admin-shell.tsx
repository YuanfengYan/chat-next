"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bot,
  ChevronDown,
  CircleDot,
  Database,
  Gauge,
  KeyRound,
  Link2,
  List,
  LogOut,
  ScrollText,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminNavigation } from "@/lib/admin/navigation";
import type { AdminNavIcon, AdminNavItem, AdminViewer } from "@/lib/admin/types";
import { authClient } from "@/lib/auth/auth-client";
import { cn } from "@/lib/utils";

const iconMap: Record<AdminNavIcon, LucideIcon> = {
  dashboard: Gauge,
  tool: Wrench,
  list: List,
  shield: ShieldCheck,
  logs: ScrollText,
  settings: Settings2,
  assistant: Bot,
  prompt: KeyRound,
  sliders: SlidersHorizontal,
  link: Link2,
  database: Database,
};

function itemMatchesPath(item: AdminNavItem, pathname: string) {
  if (item.href === pathname) return true;
  return item.children?.some((child) => child.href === pathname) ?? false;
}

/** 后台专属壳层：负责树形导航、账号区和后台内容布局。 */
export function AdminShell({ viewer, children }: { viewer: AdminViewer; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const openKeys = useMemo(() => new Set(adminNavigation.filter((item) => item.children?.some((child) => child.href === pathname)).map((item) => item.title)), [pathname]);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    await authClient.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="grid min-h-dvh lg:grid-cols-[272px_1fr]">
        <aside className="hidden border-r bg-muted/30 lg:flex lg:flex-col">
          <div className="flex h-16 items-center gap-3 px-5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold leading-none">DeepChat Admin</p>
              <p className="mt-1 text-xs text-muted-foreground">后台管理</p>
            </div>
          </div>

          <nav className="flex-1 space-y-2 px-3 py-3">
            {adminNavigation.map((item) => (
              <NavNode key={item.title} item={item} pathname={pathname} defaultOpen={openKeys.has(item.title)} />
            ))}
          </nav>

          <div className="border-t p-3">
            <div className="mb-3 flex items-center gap-3 rounded-md bg-background p-2">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary">
                {viewer.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{viewer.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{viewer.email}</span>
              </span>
            </div>
            <Button variant="outline" className="w-full justify-start bg-background" disabled={signingOut} onClick={() => void signOut()}>
              <LogOut className="size-4" />
              {signingOut ? "正在退出..." : "退出后台"}
            </Button>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="flex min-h-16 items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
            <div>
              <p className="text-xs font-medium text-muted-foreground">DeepChat Admin</p>
              <h1 className="text-lg font-semibold tracking-tight">后台管理控制台</h1>
            </div>
            <span className="rounded-md border bg-card px-3 py-1.5 text-xs text-muted-foreground">Admin</span>
          </header>
          <div className="px-4 py-5 sm:px-6 lg:px-8">{children}</div>
        </section>
      </div>
    </main>
  );
}

function NavNode({ item, pathname, defaultOpen }: { item: AdminNavItem; pathname: string; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen || !item.href);
  const Icon = iconMap[item.icon] ?? CircleDot;
  const active = itemMatchesPath(item, pathname);

  if (!item.children?.length) {
    return (
      <Button asChild variant="ghost" className={cn("h-10 w-full justify-start px-3", active && "bg-accent text-accent-foreground")}>
        <Link href={item.href ?? "#"}>
          <Icon className="size-4" />
          {item.title}
        </Link>
      </Button>
    );
  }

  return (
    <div>
      <button
        type="button"
        className={cn("flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition hover:bg-accent", active && "text-accent-foreground")}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon className="size-4" />
        <span className="flex-1">{item.title}</span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-1 space-y-1 pl-5">
          {item.children.map((child) => {
            const ChildIcon = iconMap[child.icon] ?? CircleDot;
            const childActive = child.href === pathname;
            return (
              <Button key={child.title} asChild variant="ghost" size="sm" className={cn("h-9 w-full justify-start px-3 text-muted-foreground", childActive && "bg-accent text-accent-foreground")}>
                <Link href={child.href ?? "#"}>
                  <ChildIcon className="size-3.5" />
                  {child.title}
                </Link>
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
