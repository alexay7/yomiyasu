import type {LibraryFilters} from "../../../lib/useLibraryFilters";

export const sortOptions = [
  {value:"sortName", label:"Nombre (A → Z)"},
  {value:"!sortName", label:"Nombre (Z → A)"},
  {value:"!bookCount", label:"Más volúmenes"},
  {value:"bookCount", label:"Menos volúmenes"},
  {value:"lastModifiedDate", label:"Más antiguos"},
  {value:"!lastModifiedDate", label:"Más recientes"},
  {value:"difficulty", label:"Más fáciles"},
  {value:"!difficulty", label:"Más difíciles"},
  {value:"!valoration", label:"Mejor valoradas"},
];

/** Número de filtros activos (para el badge del botón "Filtros"). */
export function activeFilterCount(filters:LibraryFilters):number {
  let count = 0;
  if (filters.letter !== "ALL") count++;
  if (filters.genre) count++;
  if (filters.author) count++;
  if (filters.status) count++;
  if (filters.readlist) count++;
  if (filters.readProgress !== "all") count++;
  if (filters.min > 0 || filters.max < 10) count++;
  if (filters.vmin > 0 || filters.vmax < 10) count++;
  if (filters.reviews > 0) count++;
  return count;
}
