import {Flame} from "lucide-react";
import {useState} from "react";
import {getFlameColor} from "../helpers/series";
import {cn} from "./cn";
import {focusRing} from "./styles";

export interface FlameRatingProps {
  /** Valor 1-5. */
  value: number;
  max?: number;
  onChange?: (value: number) => void;
  /** Nivel de dificultad para colorear (0-10); por defecto usa el propio valor. */
  difficulty?: number;
  size?: "sm" | "md";
  className?: string;
}

/** Llama de dificultad estilo YomiYasu (azul → rojo → púrpura). */
export function FlameRating({value, max = 5, onChange, difficulty, size = "sm", className}:FlameRatingProps):React.ReactElement {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  const interactive = Boolean(onChange);
  const color = getFlameColor(difficulty ?? (active / max) * 10);
  const iconClass = size === "sm" ? "size-4" : "size-5";

  const content = Array.from({length:max}, (_, index)=>{
    const flameValue = index + 1;
    const filled = flameValue <= active;

    return (
      <span key={flameValue} className="inline-flex">
        {interactive ? (
          <button
            type="button"
            aria-label={`Dificultad ${flameValue} de ${max}`}
            onMouseEnter={()=>setHover(flameValue)}
            onClick={()=>onChange?.(flameValue === value ? 0 : flameValue)}
            className={cn("p-0.5 transition-transform hover:scale-110", focusRing)}
          >
            <Flame
              className={cn(iconClass, filled ? "fill-current" : "text-app-border")}
              strokeWidth={1.5}
              style={filled ? {color} : undefined}
            />
          </button>
        ) : (
          <Flame
            className={cn(iconClass, filled ? "fill-current" : "text-app-border")}
            strokeWidth={1.5}
            style={filled ? {color} : undefined}
          />
        )}
      </span>
    );
  });

  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-label={`Dificultad ${value} de ${max}`}
      onMouseLeave={interactive ? ()=>setHover(0) : undefined}
    >
      {content}
    </span>
  );
}
