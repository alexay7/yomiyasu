import type { ReactNode } from "react";
import { cn } from "./cn";

export type BadgeVariant = "primary" | "accent" | "neutral" | "danger" | "success" | "warning" | "outline";

const variantStyles: Record<BadgeVariant, string> = {
  primary: "bg-primary text-white",
  accent: "bg-accent text-white",
  neutral: "bg-tint text-fg-muted",
  danger: "bg-danger text-white",
  success: "bg-success text-white",
  warning: "bg-warning text-white",
  outline: "border border-app-border text-fg-muted",
};

export interface BadgeProps {
  variant?: BadgeVariant;
  className?: string;
  children: ReactNode;
}

export function Badge({ variant = "neutral", className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-tight",
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
