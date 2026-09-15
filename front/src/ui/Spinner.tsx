import { LoaderCircle } from "lucide-react";
import { cn } from "./cn";

interface SpinnerProps {
  size?: number;
  className?: string;
}

export function Spinner({ size = 16, className }: SpinnerProps) {
  return <LoaderCircle aria-hidden className={cn("animate-spin", className)} size={size} strokeWidth={2.5} />;
}
