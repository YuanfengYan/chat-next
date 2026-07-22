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
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { adminNavigation } from "@/features/admin/domain/navigation";
import type { AdminNavIcon, AdminNavItem, AdminViewer } from "@/features/admin/domain/types";
import { authClient } from "@/features/auth/client/auth-client";
import { cn } from "@/shared/lib/utils";

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
      <div className={cn("grid min-h-dvh transition-[grid-template-columns] duration-200", sidebarCollapsed ? "lg:grid-cols-[72px_1fr]" : "lg:grid-cols-[272px_1fr]")}>
        <aside className="hidden overflow-hidden border-r bg-muted/30 lg:flex lg:flex-col">
          <div className={cn("flex h-16 items-center", sidebarCollapsed ? "justify-center px-2" : "gap-3 px-5")}>
            {!sidebarCollapsed && <>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ShieldCheck className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-none">DeepChat Admin</p>
                <p className="mt-1 text-xs text-muted-foreground">后台管理</p>
              </div>
            </>}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              onClick={() => setSidebarCollapsed((value) => !value)}
              aria-label={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
              title={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </Button>
          </div>

          <nav className={cn("flex-1 space-y-2 py-3", sidebarCollapsed ? "px-2" : "px-3")}>
            {adminNavigation.map((item) => (
              <NavNode key={item.title} item={item} pathname={pathname} defaultOpen={openKeys.has(item.title)} collapsed={sidebarCollapsed} onExpand={() => setSidebarCollapsed(false)} />
            ))}
          </nav>

          <div className={cn("border-t", sidebarCollapsed ? "p-2" : "p-3")}>
            <div className={cn("flex items-center rounded-md bg-background", sidebarCollapsed ? "mb-2 justify-center p-1" : "mb-3 gap-3 p-2")} title={sidebarCollapsed ? `${viewer.name} · ${viewer.email}` : undefined}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary">
                {viewer.name.slice(0, 1).toUpperCase()}
              </span>
              {!sidebarCollapsed && <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{viewer.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{viewer.email}</span>
              </span>}
            </div>
            <Button variant="outline" size={sidebarCollapsed ? "icon" : "default"} className={cn("bg-background", sidebarCollapsed ? "w-full" : "w-full justify-start")} disabled={signingOut} onClick={() => void signOut()} title={sidebarCollapsed ? "退出后台" : undefined} aria-label={sidebarCollapsed ? "退出后台" : undefined}>
              <LogOut className="size-4" />
              {!sidebarCollapsed && (signingOut ? "正在退出..." : "退出后台")}
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

function NavNode({ item, pathname, defaultOpen, collapsed, onExpand }: { item: AdminNavItem; pathname: string; defaultOpen: boolean; collapsed: boolean; onExpand: () => void }) {
  const [open, setOpen] = useState(defaultOpen || !item.href);
  const Icon = iconMap[item.icon] ?? CircleDot;
  const active = itemMatchesPath(item, pathname);

  if (!item.children?.length) {
    return (
      <Button asChild variant="ghost" className={cn("h-10 w-full", collapsed ? "justify-center px-0" : "justify-start px-3", active && "bg-accent text-accent-foreground")} title={collapsed ? item.title : undefined}>
        <Link href={item.href ?? "#"} aria-label={collapsed ? item.title : undefined}>
          <Icon className="size-4" />
          {!collapsed && item.title}
        </Link>
      </Button>
    );
  }

  return (
    <div>
      <button
        type="button"
        className={cn("flex h-10 w-full items-center rounded-md text-left text-sm font-medium transition hover:bg-accent", collapsed ? "justify-center px-0" : "gap-3 px-3", active && "bg-accent text-accent-foreground")}
        onClick={() => collapsed ? onExpand() : setOpen((value) => !value)}
        aria-label={collapsed ? `展开${item.title}` : undefined}
        title={collapsed ? item.title : undefined}
      >
        <Icon className="size-4" />
        {!collapsed && <>
          <span className="flex-1">{item.title}</span>
          <ChevronDown className={cn("size-4 text-muted-foreground transition", open && "rotate-180")} />
        </>}
      </button>
      {!collapsed && open && (
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
