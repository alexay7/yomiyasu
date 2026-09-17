import type {Book, BookWithProgress} from "../types/book";
import type {Serie, SerieWithProgress} from "../types/serie";

/** URLs de miniaturas y páginas estáticas (unificadas y sin duplicar lógica). */

export function bookThumbnail(book: Book): string {
  if (book.mokured) {
    return `/api/static/novelas/${book.seriePath}/${book.imagesFolder}/${book.thumbnailPath}`;
  }

  if (book.variant === "manga") {
    return `/api/static/mangas/${book.seriePath}/${book.imagesFolder}/${book.thumbnailPath}`;
  }

  return `/api/static/novelas/${book.seriePath}/${book.thumbnailPath}`;
}

export function serieThumbnail(serie: SerieWithProgress | Serie): string {
  return serie.variant === "manga"
    ? `/api/static/mangas/${serie.thumbnailPath}`
    : `/api/static/novelas/${serie.thumbnailPath}`;
}

/** Clave de localStorage donde mokuro persiste el estado del volumen. */
export function mokuroStorageKey(book: Pick<Book, "variant" | "seriePath" | "path">): string {
  return `mokuro_/api/static/${book.variant}s/${encodeURI(book.seriePath)}/${encodeURI(book.path)}.html`;
}

/** URL del HTML de mokuro para el modo "abrir HTML directamente". */
export function mokuroHtmlUrl(book: Pick<Book, "variant" | "seriePath" | "path">): string {
  return `/api/static/${book.variant}s/${encodeURI(book.seriePath)}/${encodeURI(book.path)}.html`;
}

/** URL de una página de un tomo sin mokuro. */
export function bookPageUrl(
  book: Pick<Book, "variant" | "seriePath" | "imagesFolder">,
  pagePath: string
): string {
  return `/api/static/${book.variant}s/${encodeURI(book.seriePath)}/${encodeURI(book.imagesFolder)}/${encodeURI(pagePath)}`;
}

/** URL de descarga directa del EPUB. */
export function bookDownloadUrl(book: Pick<BookWithProgress, "_id">): string {
  return `/api/books/${book._id}/download`;
}

const STATIC_PREFIX = "/api/static/";

/**
 * URL de la miniatura (webp 480px) de una portada estática. El backend la
 * genera en `exterior/thumbnails/` durante el rescan; si aún no existe, quien
 * la use debe caer a la original (ver CoverImage).
 */
export function thumbUrl(originalUrl: string): string {
  if (!originalUrl.startsWith(STATIC_PREFIX)) return originalUrl;

  const queryIndex = originalUrl.indexOf("?", STATIC_PREFIX.length);
  const base = queryIndex === -1 ? originalUrl : originalUrl.slice(0, queryIndex);
  const suffix = queryIndex === -1 ? "" : originalUrl.slice(queryIndex);

  const rest = base.slice(STATIC_PREFIX.length);

  if (rest.startsWith("thumbnails/")) return originalUrl;

  const dotIndex = rest.lastIndexOf(".");
  const slashIndex = rest.lastIndexOf("/");

  if (dotIndex <= slashIndex) return originalUrl;

  return `${STATIC_PREFIX}thumbnails/${rest.slice(0, dotIndex)}.webp${suffix}`;
}
