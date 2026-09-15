/**
 * Acceso a los tokens CSS desde JavaScript (charts, canvas, etc.).
 * Los valores cambian con el tema activo, así que la lectura se cachea por
 * modo de color para no consultar estilos computados en cada render.
 */

export function cssVar(name: string, fallback = ""): string {
  if (typeof window === "undefined") return fallback;

  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export interface ChartTokens {
  primary: string;
  accent: string;
  fg: string;
  fgMuted: string;
  border: string;
}

let cachedTokens: ChartTokens | null = null;
let cachedMode: boolean | null = null;

export function chartTokens(isDark: boolean): ChartTokens {
  if (cachedTokens && cachedMode === isDark) {
    return cachedTokens;
  }

  cachedTokens = {
    primary: cssVar("--primary-color", "#308054"),
    accent: cssVar("--accent-color", "#5bbfc2"),
    fg: cssVar("--fg-color", "#ebe8e3"),
    fgMuted: cssVar("--fg-muted", "#a09e9a"),
    border: cssVar("--app-border", "#ffffff1f"),
  };
  cachedMode = isDark;

  return cachedTokens;
}
