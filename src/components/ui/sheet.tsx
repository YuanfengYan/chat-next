"use client";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export function SheetContent({ className, children, side = "left", ...props }: React.ComponentProps<typeof DialogPrimitive.Content> & { side?: "left" | "right" }) {
  return <DialogPrimitive.Portal><DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm" /><DialogPrimitive.Content className={cn("fixed inset-y-0 z-50 w-[86vw] max-w-sm border bg-background p-0 shadow-xl outline-none", side === "left" ? "left-0 border-r" : "right-0 border-l", className)} {...props}>{children}<DialogPrimitive.Close className="absolute right-3 top-3 rounded-md p-2 text-muted-foreground hover:bg-accent"><X className="size-4" /><span className="sr-only">关闭</span></DialogPrimitive.Close></DialogPrimitive.Content></DialogPrimitive.Portal>;
}
export function SheetTitle(props: React.ComponentProps<typeof DialogPrimitive.Title>) { return <DialogPrimitive.Title {...props} />; }
