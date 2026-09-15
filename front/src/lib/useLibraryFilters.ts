import {useCallback, useMemo} from "react";
import {useSearchParams} from "react-router";

export interface LibraryFilters {
  letter: string;
  genre: string | null;
  author: string | null;
  sortBy: string;
  min: number;
  max: number;
  readProgress: string;
  status: string | null;
  readlist: boolean;
  page: number;
  limit: string;
}

/**
 * Filtros de biblioteca respaldados por la URL: compartibles, persistentes y
 * compatibles con atrás/adelante. Cualquier cambio reinicia la página.
 */
export function useLibraryFilters(defaultLimit: string): {
  filters: LibraryFilters;
  setFilter: (key: keyof Omit<LibraryFilters, "page">, value: string | number | boolean | null) => void;
  setPage: (page: number) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  queryParams: URLSearchParams;
} {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<LibraryFilters>(()=>({
    letter: searchParams.get("letter") || "ALL",
    genre: searchParams.get("genre"),
    author: searchParams.get("author"),
    sortBy: searchParams.get("sortBy") || "sortName",
    min: parseInt(searchParams.get("min") || "0"),
    max: parseInt(searchParams.get("max") || "10"),
    readProgress: searchParams.get("readprogress") || "all",
    status: searchParams.get("status"),
    readlist: searchParams.get("readlist") === "true",
    page: Math.max(1, parseInt(searchParams.get("page") || "1")),
    limit: searchParams.get("limit") || defaultLimit
  }), [searchParams, defaultLimit]);

  const setFilter = useCallback<ReturnType<typeof useLibraryFilters>["setFilter"]>((key, value)=>{
    const next = new URLSearchParams(searchParams);

    // Algunas claves usan el nombre del parámetro de la API en la URL
    const urlKey = key === "readProgress" ? "readprogress" : key;

    // Cualquier cambio de filtro vuelve a la primera página
    next.delete("page");

    if (value === null || value === "" || value === false) {
      next.delete(urlKey);
    } else {
      next.set(urlKey, `${value}`);
    }

    // Los valores por defecto no ensucian la URL
    if (key === "sortBy" && value === "sortName") next.delete(urlKey);
    if (key === "min" && value === 0) next.delete(urlKey);
    if (key === "max" && value === 10) next.delete(urlKey);
    if (key === "readProgress" && value === "all") next.delete(urlKey);
    if (key === "letter" && value === "ALL") next.delete(urlKey);

    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  const setPage = useCallback((page: number)=>{
    const next = new URLSearchParams(searchParams);

    if (page <= 1) {
      next.delete("page");
    } else {
      next.set("page", `${page}`);
    }

    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  const clearFilters = useCallback(()=>{
    const next = new URLSearchParams();
    if (searchParams.get("limit")) next.set("limit", searchParams.get("limit")!);
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  const hasActiveFilters = Boolean(filters.genre || filters.author || filters.status || filters.readlist || filters.readProgress !== "all" || filters.min > 0 || filters.max < 10 || filters.letter !== "ALL");

  return {filters, setFilter, setPage, clearFilters, hasActiveFilters, queryParams:searchParams};
}

/** Construye los query params para la API a partir de los filtros. */
export function buildSeriesQuery(filters: LibraryFilters, includePage: boolean): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.letter !== "ALL") {
    params.set("firstLetter", filters.letter.replace("#", "SPECIAL"));
  }
  if (filters.genre) params.set("genre", filters.genre);
  if (filters.author) params.set("author", filters.author);
  if (filters.readProgress !== "all") params.set("readprogress", filters.readProgress);
  if (filters.status) params.set("status", filters.status);
  if (filters.readlist) params.set("readlist", "true");
  if (filters.min > 0) params.set("min", `${filters.min}`);
  if (filters.max < 10) params.set("max", `${filters.max}`);
  params.set("sort", filters.sortBy);

  if (includePage) {
    params.set("page", `${filters.page}`);
    params.set("limit", filters.limit);
  }

  return params;
}

/** Query params del índice alfabético (sin paginación ni orden). */
export function buildAlphabetQuery(filters: LibraryFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.genre) params.set("genre", filters.genre);
  if (filters.status) params.set("status", filters.status);
  if (filters.author) params.set("author", filters.author);
  if (filters.min > 0) params.set("min", `${filters.min}`);
  if (filters.max < 10) params.set("max", `${filters.max}`);

  return params;
}
