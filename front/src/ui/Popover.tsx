import * as PopoverPrimitive from "@radix-ui/react-popover";
import { forwardRef } from "react";
import { cn } from "./cn";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;
export const PopoverClose = PopoverPrimitive.Close;

export const PopoverContent = forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(function PopoverContent({ className, align = "center", sideOffset = 8, ...props }, ref) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={8}
        className={cn(
          "z-50 w-72 rounded-lg border border-app-border bg-app-surface p-4 text-fg shadow-lg",
          // En móvil el contenido puede no caber: se limita al hueco real que
          // Radix deja alrededor del trigger y se hace scrollable.
          "max-h-[var(--radix-popover-content-available-height)] max-w-[var(--radix-popover-content-available-width)] overflow-y-auto overscroll-contain",
          "data-[state=open]:animate-content-in data-[state=closed]:animate-content-out",
          "[transform-origin:var(--radix-popover-content-transform-origin)]",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
});
