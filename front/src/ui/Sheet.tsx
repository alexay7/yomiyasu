import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "./cn";
import { DialogOverlay } from "./Dialog";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

const sideStyles = {
  right:
    "inset-y-0 right-0 h-full w-full border-l data-[state=open]:animate-sheet-in-right data-[state=closed]:animate-sheet-out-right",
  bottom:
    "inset-x-0 bottom-0 max-h-[88svh] rounded-t-2xl border-t data-[state=open]:animate-sheet-in-bottom data-[state=closed]:animate-sheet-out-bottom",
} as const;

const widthStyles = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-xl",
} as const;

export interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: keyof typeof sideStyles;
  width?: keyof typeof widthStyles;
}

export const SheetContent = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(function SheetContent({ className, children, side = "right", width = "sm", ...props }, ref) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed z-50 flex flex-col border-app-border bg-app-surface text-fg shadow-xl focus:outline-none",
          sideStyles[side],
          side === "right" && widthStyles[width],
          className,
        )}
        {...props}
      >
        {side === "bottom" ? (
          <div className="mx-auto my-2 h-1 w-10 shrink-0 rounded-full bg-app-border" aria-hidden />
        ) : null}
        {children}
        <DialogPrimitive.Close
          className={cn(
            "absolute right-3 top-3 rounded-md p-1.5 text-fg-muted transition-colors hover:bg-tint hover:text-fg",
            "focus:bg-tint focus:text-fg focus:outline-none",
            side === "bottom" && "top-4",
          )}
        >
          <X className="size-4" />
          <span className="sr-only">Cerrar</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});

export const SheetHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function SheetHeader(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={cn("flex shrink-0 flex-col gap-1 border-b border-app-border px-5 py-4 pr-12", className)} {...props} />;
});

export const SheetTitle = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(function SheetTitle({ className, ...props }, ref) {
  return <DialogPrimitive.Title ref={ref} className={cn("text-base font-semibold text-fg", className)} {...props} />;
});

export const SheetDescription = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(function SheetDescription({ className, ...props }, ref) {
  return <DialogPrimitive.Description ref={ref} className={cn("text-sm text-fg-muted", className)} {...props} />;
});

export const SheetBody = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function SheetBody(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={cn("flex-1 overflow-y-auto px-5 py-4", className)} {...props} />;
});

export const SheetFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function SheetFooter(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn("flex shrink-0 items-center justify-end gap-2 border-t border-app-border px-5 py-4", className)}
      {...props}
    />
  );
});
