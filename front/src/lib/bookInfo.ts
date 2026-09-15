import {formatTime} from "../helpers/helpers";
import type {BookWithProgress} from "../types/book";
import type {SiteConfig} from "../types/settings";

type BookView = SiteConfig["bookView"];

/** Porcentaje leído (0-100) de un volumen, según su tipo. */
export function getBookProgressPercent(book: BookWithProgress, read: boolean): number {
  if (!read) return 0;
  if (book.status === "completed") return 100;
  if (!book.lastProgress) return 0;

  if (book.variant === "manga" || book.mokured) {
    return Math.min(100, (book.lastProgress.currentPage * 100) / book.pages);
  }

  return Math.min(100, ((book.lastProgress.characters || 0) * 100) / (book.characters || 1));
}

/** Texto informativo del volumen según la preferencia del usuario. */
export function getBookInfoText(book: BookWithProgress, bookView: BookView): string {
  if (book.variant === "novela" && !book.mokured) {
    return `${book.characters} caracteres`;
  }

  switch (bookView) {
    case "characters": {
      return `${book.characters} caracteres`;
    }
    case "pages": {
      return `${book.pages} páginas`;
    }
    case "both": {
      return `${book.pages} pags y ${book.characters} chars`;
    }
    case "remainingchars": {
      if (!book.pageChars || !book.lastProgress || !book.characters) return `${book.characters} caracteres`;
      return `${book.characters - book.pageChars[book.lastProgress.currentPage]} caract. restantes`;
    }
    case "remainingpages": {
      if (!book.lastProgress || !book.characters) return `${book.pages} páginas`;
      return `${book.pages - book.lastProgress.currentPage} pags. restantes`;
    }
    case "remainingtime": {
      if (!book.pageChars || !book.lastProgress || !book.characters) return `${book.characters} caracteres`;
      const speed = book.pageChars[book.lastProgress.currentPage] / book.lastProgress.time;
      const charsLeft = book.characters - book.pageChars[book.lastProgress.currentPage];
      return `${formatTime(charsLeft / (speed === 0 ? 1 : speed))}`;
    }
    default: {
      return `${book.pages} páginas`;
    }
  }
}
