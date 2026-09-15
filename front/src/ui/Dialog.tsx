import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "./cn";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export const DialogOverlay = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(function DialogOverlay({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        "fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out",
        className,
      )}
      {...props}
    />
  );
});

const sizeStyles = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
} as const;

export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  size?: keyof typeof sizeStyles;
  /** Oculta el botón de cierre de la esquina superior derecha. */
  hideClose?: boolean;
  /** Sin fondo oscurecido (p. ej. el diccionario sobre el lector). */
  hideOverlay?: boolean;
}

export const DialogContent = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(function DialogContent({ className, children, size = "md", hideClose = false, hideOverlay = false, ...props }, ref) {
  return (
    <DialogPrimitive.Portal>
      {!hideOverlay ? <DialogOverlay /> : null}
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100svh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col",
          "rounded-xl border border-app-border bg-app-surface p-6 text-fg shadow-xl",
          "data-[state=open]:animate-content-in data-[state=closed]:animate-content-out",
          "focus:outline-none",
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {children}
        {!hideClose ? (
          <DialogPrimitive.Close
            className={cn(
              "absolute right-3 top-3 rounded-md p-1.5 text-fg-muted transition-colors hover:bg-tint hover:text-fg",
              "focus:bg-tint focus:text-fg focus:outline-none",
            )}
          >
            <X className="size-4" />
            <span className="sr-only">Cerrar</span>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});

export const DialogHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function DialogHeader(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={cn("flex flex-col gap-1 pr-8", className)} {...props} />;
});

export const DialogTitle = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(function DialogTitle({ className, ...props }, ref) {
  return <DialogPrimitive.Title ref={ref} className={cn("text-lg font-semibold text-fg", className)} {...props} />;
});

export const DialogDescription = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(function DialogDescription({ className, ...props }, ref) {
  return <DialogPrimitive.Description ref={ref} className={cn("text-sm text-fg-muted", className)} {...props} />;
});

export const DialogBody = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function DialogBody(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={cn("mt-4 flex-1 overflow-y-auto", className)} {...props} />;
});

export const DialogFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function DialogFooter(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn("-mx-6 -mb-6 mt-6 flex shrink-0 items-center justify-end gap-2 border-t border-app-border px-6 py-4", className)}
      {...props}
    />
  );
});
