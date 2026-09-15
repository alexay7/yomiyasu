import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";
import { disabledStyles, focusRing } from "./styles";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: "sm" | "md";
  invalid?: boolean;
  leadingIcon?: ReactNode;
}

const sizeStyles = {
  sm: "h-8 text-[13px]",
  md: "h-10 text-sm",
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { size = "md", invalid = false, leadingIcon, className, ...props },
  ref,
) {
  const input = (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "w-full rounded-lg border border-app-border bg-app-surface px-3 text-fg transition-colors",
        "placeholder:text-fg-muted/70",
        focusRing,
        disabledStyles,
        sizeStyles[size],
        invalid && "border-danger focus-visible:outline-danger",
        Boolean(leadingIcon) && "pl-9",
        className,
      )}
      {...props}
    />
  );

  if (!leadingIcon) return input;

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted [&_svg]:size-4">
        {leadingIcon}
      </span>
      {input}
    </div>
  );
});
