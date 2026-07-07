import * as React from "react";
import { cn } from "@/lib/utils";

/** 通用文本输入框，统一焦点、错误和禁用状态。 */
export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return <input type={type} className={cn("h-11 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/15", className)} {...props} />;
}
