import {Star} from "lucide-react";
import {useState} from "react";
import {cn} from "./cn";
import {focusRing} from "./styles";

export interface RatingProps {
  /** Valor actual en la escala indicada por `max`. */
  value: number;
  max?: number;
  className?: string;
  starClassName?: string;
}

export function Rating({ value, max = 5, className, starClassName }: RatingProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <span
      role="img"
      aria-label={`${value} de ${max}`}
      className={cn("relative inline-flex", className)}
    >
      <span className="flex gap-0.5 text-app-border">{renderStars(max, starClassName)}</span>
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 flex gap-0.5 overflow-hidden text-warning"
        style={{ width: `${percent}%` }}
      >
        {renderStars(max, cn("fill-current", starClassName))}
      </span>
    </span>
  );
}

export interface RatingInputProps {
  value: number;
  max?: number;
  onChange: (value: number) => void;
  className?: string;
}

/** Selector de estrellas (valores enteros). */
export function RatingInput({value, max = 5, onChange, className}:RatingInputProps):React.ReactElement {
  const [hover, setHover] = useState(0);
  const active = hover || value;

  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} onMouseLeave={()=>setHover(0)}>
      {Array.from({length:max}, (_, index)=>{
        const starValue = index + 1;

        return (
          <button
            key={starValue}
            type="button"
            aria-label={`${starValue} de ${max}`}
            onMouseEnter={()=>setHover(starValue)}
            onClick={()=>onChange(starValue === value ? 0 : starValue)}
            className={cn("rounded-sm p-0.5 transition-transform hover:scale-110", focusRing)}
          >
            <Star
              className={cn("size-5", starValue <= active ? "fill-current text-warning" : "text-app-border")}
              strokeWidth={1.5}
            />
          </button>
        );
      })}
    </span>
  );
}

function renderStars(count: number, className?: string) {
  return Array.from({ length: count }, (_, index) => (
    <Star key={index} strokeWidth={1.5} className={cn("size-3.5 shrink-0", className)} />
  ));
}
