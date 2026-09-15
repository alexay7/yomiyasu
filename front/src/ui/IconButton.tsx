import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "./cn";
import { Spinner } from "./Spinner";
import { disabledStyles, focusRing } from "./styles";

export type IconButtonVariant = "ghost" | "solid" | "primary" | "danger";
export type IconButtonSize = "sm" | "md" | "lg";

const variantStyles: Record<IconButtonVariant, string> = {
  ghost: "text-fg-muted hover:bg-tint hover:text-fg",
  solid: "border border-app-border bg-app-surface text-fg hover:bg-tint",
  primary: "bg-primary text-white hover:bg-primary/90",
  danger: "text-danger hover:bg-danger/10",
};

const sizeStyles: Record<IconButtonSize, string> = {
  sm: "size-7 [&_svg]:size-3.5",
  md: "size-9 [&_svg]:size-[18px]",
  lg: "size-11 [&_svg]:size-5",
};

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Nombre accesible del botón; se usa como aria-label. */
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  loading?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = "ghost", size = "md", loading = false, className, children, type = "button", disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-label={label}
      title={props.title ?? label}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-lg transition-colors",
        sizeStyles[size],
        variantStyles[variant],
        focusRing,
        disabledStyles,
        className,
      )}
      {...props}
    >
      {loading ? <Spinner size={size === "sm" ? 14 : size === "lg" ? 20 : 16} /> : children}
    </button>
  );
});
