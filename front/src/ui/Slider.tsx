import * as SliderPrimitive from "@radix-ui/react-slider";
import { forwardRef } from "react";
import { cn } from "./cn";
import { focusRing } from "./styles";

export type SliderProps = Omit<React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>, "className"> & {
  className?: string;
};

export const Slider = forwardRef<React.ElementRef<typeof SliderPrimitive.Root>, SliderProps>(function Slider(
  { className, value, defaultValue, min = 0, max = 100, ...props },
  ref,
) {
  const values = value ?? defaultValue ?? [min];

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex h-5 w-full touch-none select-none items-center data-[disabled]:opacity-50",
        className,
      )}
      value={value}
      defaultValue={defaultValue}
      min={min}
      max={max}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-app-border">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {values.map((_, index)=>(
        <SliderPrimitive.Thumb
          key={index}
          className={cn(
            "block size-4 rounded-full border-2 border-app-surface bg-primary shadow transition-transform hover:scale-110",
            focusRing,
          )}
        />
      ))}
    </SliderPrimitive.Root>
  );
});
