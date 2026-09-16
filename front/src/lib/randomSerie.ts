import {api} from "../api/api";
import type {SerieWithProgress} from "../types/serie";
import {buildSeriesQuery, type LibraryFilters} from "./useLibraryFilters";

export type RandomVariant = "manga" | "novela";

/** Subconjunto de filtros que definen la tirada del dado (se recuerda entre sesiones). */
export type RandomCriteria = Pick<LibraryFilters, "letter" | "genre" | "author" | "status" | "readProgress" | "readlist" | "min" | "max">;

const CRITERIA_DEFAULTS: RandomCriteria = {
  letter: "ALL",
  genre: null,
  author: null,
  status: null,
  readProgress: "all",
  readlist: false,
  min: 0,
  max: 10
};

function storageKey(variant:RandomVariant):string {
  return `random-criteria-${variant}`;
}

/** Guarda los criterios con los que se tiró el dado para poder repetir la tirada (#180). */
export function saveRandomCriteria(variant:RandomVariant, filters:LibraryFilters):void {
  const criteria:RandomCriteria = {
    letter: filters.letter,
    genre: filters.genre,
    author: filters.author,
    status: filters.status,
    readProgress: filters.readProgress,
    readlist: filters.readlist,
    min: filters.min,
    max: filters.max
  };

  try {
    localStorage.setItem(storageKey(variant), JSON.stringify(criteria));
  } catch {
    // Sin persistencia disponible: el dado sigue funcionando, solo no recuerda
  }
}

export function loadRandomCriteria(variant:RandomVariant):RandomCriteria {
  try {
    const raw = localStorage.getItem(storageKey(variant));

    if (raw) {
      return {...CRITERIA_DEFAULTS, ...(JSON.parse(raw) as Partial<RandomCriteria>)};
    }
  } catch {
    // Criterios corruptos: se usan los valores por defecto
  }

  return CRITERIA_DEFAULTS;
}

/**
 * Tira el dado con los últimos criterios guardados. Devuelve `null` si no hay
 * ninguna serie que coincida; puede lanzar si la petición falla.
 */
export async function rollRandomSerie(variant:RandomVariant):Promise<SerieWithProgress | null> {
  const filters:LibraryFilters = {
    ...CRITERIA_DEFAULTS,
    ...loadRandomCriteria(variant),
    vmin: 0,
    vmax: 10,
    reviews: 0,
    sortBy: "sortName",
    page: 1,
    limit: "25"
  };

  const params = buildSeriesQuery(filters, false);

  const serie = await api.get<SerieWithProgress>(`series/${variant}/random?${params.toString()}`);

  return serie ?? null;
}
