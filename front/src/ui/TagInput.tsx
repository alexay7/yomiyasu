import {X} from "lucide-react";
import {useId, useState, type KeyboardEvent} from "react";
import {cn} from "./cn";
import {focusRing} from "./styles";

export interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  /** Sugerencias mostradas en el datalist nativo. */
  suggestions?: string[];
  placeholder?: string;
  id?: string;
  className?: string;
}

/**
 * Editor de listas de etiquetas (géneros, autores, nombres alternativos):
 * chips con borrado + entrada libre con sugerencias.
 */
export function TagInput({value, onChange, suggestions = [], placeholder, id, className}: TagInputProps):React.ReactElement {
  const [draft, setDraft] = useState("");
  const listId = useId();

  function addTag(raw: string):void {
    const tag = raw.trim();
    if (!tag || value.includes(tag)) {
      setDraft("");
      return;
    }

    onChange([...value, tag]);
    setDraft("");
  }

  function removeTag(tag: string):void {
    onChange(value.filter((item)=>item !== tag));
  }

  function handleKeyDown(e:KeyboardEvent<HTMLInputElement>):void {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
      return;
    }

    if (e.key === "Backspace" && draft === "" && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 rounded-lg border border-app-border bg-app-surface px-2 py-1.5 transition-colors",
        "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent",
        className,
      )}
    >
      {value.map((tag)=>(
        <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-tint px-2 py-0.5 text-xs font-medium text-fg">
          {tag}
          <button
            type="button"
            onClick={()=>removeTag(tag)}
            className="rounded-sm text-fg-muted transition-colors hover:text-danger"
            aria-label={`Quitar ${tag}`}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        list={suggestions.length > 0 ? listId : undefined}
        value={draft}
        onChange={(e)=>setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={()=>addTag(draft)}
        placeholder={value.length === 0 ? placeholder : undefined}
        className={cn("h-7 min-w-24 flex-1 bg-transparent px-1 text-sm text-fg outline-none placeholder:text-fg-muted/70", focusRing)}
      />
      {suggestions.length > 0 ? (
        <datalist id={listId}>
          {suggestions.map((suggestion)=>(
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      ) : null}
    </div>
  );
}
