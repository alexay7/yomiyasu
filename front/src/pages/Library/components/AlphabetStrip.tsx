import {cn} from "../../../ui/cn";
import type {Alphabet} from "../../../types/serie";

interface AlphabetStripProps {
  alphabet: Alphabet[];
  selected: string;
  onSelect: (letter: string) => void;
}

/** Índice alfabético de la biblioteca; las letras sin series quedan deshabilitadas. */
export function AlphabetStrip({alphabet, selected, onSelect}:AlphabetStripProps):React.ReactElement {
  return (
    <div className="no-scrollbar flex items-center gap-0.5 overflow-x-auto px-4 py-1.5" role="group" aria-label="Filtrar por letra">
      <button
        type="button"
        onClick={()=>onSelect("ALL")}
        className={cn(
          "shrink-0 rounded-md px-2 py-1 text-xs font-semibold transition-colors",
          selected === "ALL" ? "text-primary" : "text-fg-muted hover:bg-tint hover:text-fg",
        )}
      >
        Todas
      </button>
      {alphabet
        .filter((letter)=>letter.group.toUpperCase() !== "ALL")
        .map((letter)=>{
        const value = letter.group.toUpperCase();
        const disabled = letter.count === 0;
        const active = selected === value;

        return (
          <button
            key={letter.group}
            type="button"
            disabled={disabled}
            onClick={()=>onSelect(value)}
            className={cn(
              "size-7 shrink-0 rounded-md text-xs font-semibold transition-colors",
              active
                ? "text-primary"
                : disabled
                  ? "cursor-not-allowed text-fg-muted/40"
                  : "text-fg-muted hover:bg-tint hover:text-fg",
            )}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}
