import {ArrowDown, ArrowUp, ArrowUpDown} from "lucide-react";
import type {ReactNode} from "react";
import {Skeleton} from "./Skeleton";
import {cn} from "./cn";

export type SortDirection = "asc" | "desc";

export interface TableColumn<T> {
  key: string;
  header: ReactNode;
  /** Campo de ordenación enviado al backend (si es ordenable). */
  sortField?: string;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
  render: (row: T) => ReactNode;
}

export interface TableSort {
  field: string;
  direction: SortDirection;
}

export interface TableProps<T> {
  columns: Array<TableColumn<T>>;
  rows: T[];
  getRowId: (row: T) => string;
  loading?: boolean;
  sort?: TableSort | null;
  /** Se llama al pulsar una cabecera ordenable (alterna asc/desc). */
  onSortChange?: (field: string, direction: SortDirection) => void;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
  /** Número de filas esqueleto durante la carga. */
  skeletonRows?: number;
  className?: string;
}

export function Table<T>({
  columns,
  rows,
  getRowId,
  loading = false,
  sort = null,
  onSortChange,
  onRowClick,
  empty,
  skeletonRows = 6,
  className,
}:TableProps<T>):React.ReactElement {
  function handleSort(column: TableColumn<T>):void {
    if (!column.sortable || !onSortChange) return;

    const field = column.sortField ?? column.key;
    const nextDirection: SortDirection = sort?.field === field && sort.direction === "desc" ? "asc" : "desc";
    onSortChange(field, nextDirection);
  }

  return (
    <div className={cn("overflow-x-auto rounded-xl border border-app-border bg-app-surface", className)}>
      <table className="w-full min-w-[52rem] border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-app-surface">
          <tr className="border-b border-app-border">
            {columns.map((column)=>(
              <th
                key={column.key}
                style={column.width ? {width: column.width} : undefined}
                className={cn(
                  "px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted",
                  column.align === "right" && "text-right",
                  column.align === "center" && "text-center",
                )}
              >
                {column.sortable ? (
                  <button
                    type="button"
                    onClick={()=>handleSort(column)}
                    className={cn(
                      "inline-flex items-center gap-1 transition-colors hover:text-fg",
                      sort?.field === (column.sortField ?? column.key) && "text-fg",
                    )}
                  >
                    {column.header}
                    {sort?.field === (column.sortField ?? column.key) ? (
                      sort.direction === "desc" ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />
                    ) : (
                      <ArrowUpDown className="size-3 opacity-50" />
                    )}
                  </button>
                ) : column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({length:skeletonRows}, (_, rowIndex)=>(
              <tr key={`skeleton-${rowIndex}`} className="border-b border-app-border/60">
                {columns.map((column)=>(
                  <td key={column.key} className="px-3 py-3">
                    <Skeleton variant="text" className="w-3/4" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-10 text-center text-fg-muted">
                {empty ?? "Sin resultados"}
              </td>
            </tr>
          ) : (
            rows.map((row)=>(
              <tr
                key={getRowId(row)}
                onClick={onRowClick ? ()=>onRowClick(row) : undefined}
                className={cn(
                  "border-b border-app-border/60 transition-colors last:border-0",
                  onRowClick && "cursor-pointer hover:bg-tint",
                )}
              >
                {columns.map((column)=>(
                  <td
                    key={column.key}
                    className={cn(
                      "px-3 py-2.5 text-fg",
                      column.align === "right" && "text-right",
                      column.align === "center" && "text-center",
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
