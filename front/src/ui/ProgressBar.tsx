import { cn } from "./cn";

export interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
}

export function ProgressBar({ value, max = 100, className, barClassName }: ProgressBarProps) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      className={cn("h-1 w-full overflow-hidden bg-app-border/60", className)}
    >
      <div
        className={cn("h-full bg-primary transition-[width] duration-300", barClassName)}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
