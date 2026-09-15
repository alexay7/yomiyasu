import { cn } from "./cn";

export interface SkeletonProps {
  variant?: "rect" | "text" | "circle";
  className?: string;
}

export function Skeleton({ variant = "rect", className }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse bg-tint",
        variant === "circle" ? "rounded-full" : variant === "text" ? "h-4 w-full rounded" : "rounded-md",
        className,
      )}
    />
  );
}
