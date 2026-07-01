"use client";
import * as React from "react";
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";
export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;
export function DropdownMenuContent({ className, sideOffset = 6, ...props }: React.ComponentProps<typeof DropdownPrimitive.Content>) {
  return <DropdownPrimitive.Portal><DropdownPrimitive.Content sideOffset={sideOffset} className={cn("z-50 min-w-40 rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg", className)} {...props} /></DropdownPrimitive.Portal>;
}
export function DropdownMenuItem({ className, ...props }: React.ComponentProps<typeof DropdownPrimitive.Item>) {
  return <DropdownPrimitive.Item className={cn("flex cursor-default select-none items-center gap-2 rounded-md px-2 py-2 text-sm outline-none focus:bg-accent data-[disabled]:opacity-50", className)} {...props} />;
}
