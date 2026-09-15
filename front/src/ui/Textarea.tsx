import {forwardRef, type TextareaHTMLAttributes} from "react";
import { cn } from "./cn";
import { disabledStyles, focusRing } from "./styles";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {className, invalid = false, rows = 4, ...props},
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        "w-full resize-y rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-fg transition-colors",
        "placeholder:text-fg-muted/70",
        focusRing,
        disabledStyles,
        invalid && "border-danger focus-visible:outline-danger",
        className,
      )}
      {...props}
    />
  );
});
