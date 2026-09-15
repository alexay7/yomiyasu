import {ChevronLeft, ChevronRight, Ellipsis} from "lucide-react";
import {IconButton} from "./IconButton";
import {cn} from "./cn";

export interface PaginationProps {
  /** Página actual, 1-based. */
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function pageWindow(page: number, pages: number): Array<number | "gap"> {
  if (pages <= 7) {
    return Array.from({length:pages}, (_, index)=>index + 1);
  }

  const items: Array<number | "gap"> = [1];

  if (page > 3) items.push("gap");

  const start = Math.max(2, page - 1);
  const end = Math.min(pages - 1, page + 1);

  for (let current = start; current <= end; current++) {
    items.push(current);
  }

  if (page < pages - 2) items.push("gap");

  items.push(pages);

  return items;
}

export function Pagination({page, pages, onPageChange, className}:PaginationProps):React.ReactElement | null {
  if (pages <= 1) return null;

  return (
    <nav aria-label="Paginación" className={cn("flex items-center justify-center gap-1", className)}>
      <IconButton
        label="Página anterior"
        size="sm"
        variant="solid"
        disabled={page <= 1}
        onClick={()=>onPageChange(page - 1)}
      >
        <ChevronLeft />
      </IconButton>

      {pageWindow(page, pages).map((item, index)=>(
        item === "gap" ? (
          <span key={`gap-${index}`} className="flex size-7 items-center justify-center text-fg-muted">
            <Ellipsis className="size-3.5" />
          </span>
        ) : (
          <button
            key={item}
            type="button"
            aria-current={item === page ? "page" : undefined}
            onClick={()=>onPageChange(item)}
            className={cn(
              "flex size-7 items-center justify-center rounded-md text-[13px] font-medium transition-colors",
              item === page
                ? "bg-primary text-white"
                : "text-fg-muted hover:bg-tint hover:text-fg",
            )}
          >
            {item}
          </button>
        )
      ))}

      <IconButton
        label="Página siguiente"
        size="sm"
        variant="solid"
        disabled={page >= pages}
        onClick={()=>onPageChange(page + 1)}
      >
        <ChevronRight />
      </IconButton>
    </nav>
  );
}
