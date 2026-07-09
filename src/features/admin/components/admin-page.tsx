import type { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";

export function AdminPageHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

export function AdminSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-md border bg-card">
      <div className="p-4">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Separator />
      {children}
    </section>
  );
}

export function AdminEmptyState({ text }: { text: string }) {
  return <div className="px-4 py-10 text-center text-sm text-muted-foreground">{text}</div>;
}

export function StatusPill({ active, activeText = "启用", inactiveText = "停用" }: { active: boolean; activeText?: string; inactiveText?: string }) {
  return (
    <span className={active ? "inline-flex rounded-md bg-emerald-500/12 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300" : "inline-flex rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"}>
      {active ? activeText : inactiveText}
    </span>
  );
}
