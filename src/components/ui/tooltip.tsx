"use client";
import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export function TooltipContent(props: React.ComponentProps<typeof TooltipPrimitive.Content>) { return <TooltipPrimitive.Portal><TooltipPrimitive.Content sideOffset={6} className="z-50 rounded-md bg-foreground px-2.5 py-1.5 text-xs text-background shadow" {...props} /></TooltipPrimitive.Portal>; }
