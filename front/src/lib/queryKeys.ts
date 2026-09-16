/**
 * Factoría central de claves de TanStack Query.
 *
 * Convenciones:
 * - Las claves de lista usan el primer elemento como prefijo invalidable
 *   (p. ej. `["serie"]` invalida todas las series, `["serie-books"]` todos
 *   los listados de volúmenes de una serie).
 * - Las claves de detalle añaden el id como segundo elemento.
 */

export const keys = {
  // Libros
  book: (id?: string) => ["book", id] as const,
  bookProgress: (id?: string) => ["book-progress", id] as const,
  bookProgresses: (id: string) => ["book-progresses", id] as const,
  bookImages: (id: string) => ["book-images", id] as const,

  // Series
  serie: (id?: string) => ["serie", id] as const,
  serieBooks: (id?: string) => ["serie-books", id] as const,
  serieSpeed: (id: string) => ["serie-speed", id] as const,
  seriesList: (variant: string, filters?: unknown) => ["series-list", variant, filters] as const,
  seriesAlphabet: (variant: string, filters?: unknown) => ["series-alphabet", variant, filters] as const,
  genresAndArtists: ["genres-artists"] as const,

  // Estanterías del inicio
  reading: (mainView: string) => ["reading", mainView] as const,
  tablero: (mainView: string) => ["tablero", mainView] as const,
  recentBooks: (variant: string) => ["recent-books", variant] as const,
  newSeries: (variant: string) => ["new-series", variant] as const,
  recentSeries: (variant: string) => ["recent-series", variant] as const,
  readlist: (variant: string) => ["readlist", variant] as const,
  paused: (variant: string) => ["paused", variant] as const,

  // Progreso e historial
  progressLogs: (params?: unknown) => ["progress-logs", params] as const,
  dayLogs: (year: number, month: number, day: number) => ["day-logs", year, month, day] as const,
  streak: (year: number, month: number) => ["streak", year, month] as const,
  stats: ["stats"] as const,
  graphs: ["graphs"] as const,

  // Otros
  words: (sort: string) => ["words", sort] as const,
  users: ["users"] as const,
  dictionary: (version: string, word: string) => ["dictionary", version, word] as const,

  // Anki (formulario local, sin invalidación entre páginas)
  ankiDecks: ["anki-decks"] as const,
  ankiModels: ["anki-models"] as const,
  ankiFields: (model: string) => ["anki-fields", model] as const,
};
