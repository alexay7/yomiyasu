import { queryClient } from "../api/queryClient";
import { keys } from "./queryKeys";

/**
 * Invalidación quirúrgica de datos.
 *
 * Cada helper marca como obsoletas las consultas afectadas por un tipo de
 * mutación. TanStack Query refetchea solo las consultas activas; el resto se
 * refresca la próxima vez que se montan.
 */

function invalidate(prefix: readonly unknown[]): void {
  void queryClient.invalidateQueries({ queryKey: prefix });
}

/** Estanterías del inicio: en progreso, tablero, novedades y leer más tarde. */
function invalidateShelves(): void {
  invalidate(["reading"]);
  invalidate(["tablero"]);
  invalidate(["recent-books"]);
  invalidate(["new-series"]);
  invalidate(["recent-series"]);
  invalidate(["readlist"]);
}

/** Listados y alfabeto de biblioteca. */
function invalidateSeriesLists(): void {
  invalidate(["series-list"]);
  invalidate(["series-alphabet"]);
  invalidate(["genres-artists"]);
}

/**
 * Cambios de progreso de lectura (marcar leído, editar progreso, pausar,
 * guardado periódico del lector). No invalida `book-progress` para no
 * alterar la sesión de lectura activa.
 */
export function invalidateProgress(): void {
  invalidateShelves();
  invalidateSeriesLists();
  invalidate(["serie"]);
  invalidate(["serie-books"]);
  invalidate(["serie-speed"]);
  invalidate(["book-progresses"]);
  invalidate(["progress-logs"]);
  invalidate(["day-logs"]);
  invalidate(["streak"]);
  invalidate(["stats"]);
  invalidate(["graphs"]);
}

/** Cambios en la lista "Leer más tarde". */
export function invalidateReadlist(): void {
  invalidate(["readlist"]);
  invalidateSeriesLists();
  invalidate(["serie"]);
}

/** Datos de una serie concreta (edición, reseñas, nombres automáticos). */
export function invalidateSerie(id: string): void {
  invalidate(keys.serie(id));
  invalidate(keys.serieBooks(id));
  invalidate(["serie-speed"]);
  invalidateSeriesLists();
}

/** Datos de un libro concreto (edición, portada, progreso individual). */
export function invalidateBook(id: string): void {
  invalidate(keys.book(id));
  invalidate(keys.bookProgress(id));
  invalidate(keys.bookProgresses(id));
  invalidate(["book-images"]);
}

/** Palabras guardadas. */
export function invalidateWords(): void {
  invalidate(["words"]);
}

/** Usuarios (panel de administración). */
export function invalidateUsers(): void {
  invalidate(["users"]);
}

/**
 * Actualización completa de la biblioteca (socket `LIBRARY_UPDATE` o
 * reescaneo): todo lo que depende del contenido de la biblioteca.
 */
export function invalidateLibraryUpdate(): void {
  invalidateShelves();
  invalidateSeriesLists();
  invalidate(["serie"]);
  invalidate(["serie-books"]);
  invalidate(["serie-speed"]);
  invalidate(["book"]);
  invalidate(["book-progresses"]);
  invalidate(["book-images"]);
}
