import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
  /** Acción principal (normalmente un Button). */
  children?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, className, children }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-12 text-center", className)}>
      {Icon ? (
        <span className="flex size-14 items-center justify-center rounded-full bg-tint text-fg-muted">
          <Icon className="size-7" strokeWidth={1.5} />
        </span>
      ) : null}
      <div className="space-y-1">
        <p className="text-base font-semibold text-fg">{title}</p>
        {description ? <p className="mx-auto max-w-md text-sm text-fg-muted">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}
