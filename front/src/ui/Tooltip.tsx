import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";
import { cn } from "./cn";

export interface TooltipProps {
  content: ReactNode;
  /** Elemento que activa el tooltip. Debe aceptar ref (cualquier elemento JSX lo hace). */
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  delayDuration?: number;
  disabled?: boolean;
  className?: string;
}

export function Tooltip({ content, children, side = "top", delayDuration = 300, disabled = false, className }: TooltipProps) {
  if (disabled || content === null || content === undefined || content === "") {
    return <>{children}</>;
  }

  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            collisionPadding={8}
            className={cn(
              "z-50 max-w-64 rounded-md bg-fg px-2 py-1 text-xs font-medium text-app-bg shadow-md",
              "data-[state=delayed-open]:animate-content-in data-[state=instant-open]:animate-content-in",
              "[transform-origin:var(--radix-tooltip-content-transform-origin)]",
              className,
            )}
          >
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
