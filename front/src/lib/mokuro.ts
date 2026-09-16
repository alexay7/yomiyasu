import {buildMokuroScript, mokuroStyles} from "../helpers/mokuroScript";
import type {Book} from "../types/book";
import type {ReaderConfig} from "../types/settings";
import {mokuroStorageKey} from "./media";

export type MokuroStoredSettings = ReaderConfig & {
  page_idx:number;
  page2_idx:number;
  editableText:boolean;
  eInkMode:boolean;
  backgroundColor:string;
};

/**
 * Ajustes por defecto que mokuro persiste en localStorage.
 *
 * IMPORTANTE: debe incluir TODAS las claves del `defaultState` de mokuro,
 * porque su `loadState()` reemplaza su estado con lo que encuentre en
 * localStorage. Si falta alguna clave (p. ej. `editableText`) su
 * `updateProperties()` lanza una excepción durante la inicialización, nunca
 * llega a calcular `num_pages` (queda en -1) y el lector se queda en negro.
 */
export function defaultMokuroSettings(): MokuroStoredSettings {
  return {
    page_idx:0,
    page2_idx:-1,
    hasCover:false,
    r2l:true,
    singlePageView:false,
    ctrlToPan:false,
    textBoxBorders:false,
    editableText:false,
    displayOCR:true,
    fontSize:"auto",
    eInkMode:false,
    defaultZoomMode:"fit to screen",
    toggleOCRTextBoxes:false,
    backgroundColor:"#C4C3D0",
    // Ajustes propios de YomiYasu (mokuro los ignora)
    panAndZoom:true,
    nativeDictionary:true,
    dictionaryVersion:"word",
    scrollChange:true,
    fontFamily:"IPA"
  };
}

/** Lee el estado que mokuro persiste para un volumen (tolerante a datos corruptos). */
export function readMokuroSettings(book: Pick<Book, "variant" | "seriePath" | "path">): MokuroStoredSettings {
  const base = defaultMokuroSettings();

  try {
    const raw = localStorage.getItem(mokuroStorageKey(book));

    if (raw) {
      return {...base, ...(JSON.parse(raw) as Partial<MokuroStoredSettings>)};
    }
  } catch {
    // Estado corrupto: se regenera con los valores por defecto
  }

  return base;
}

/**
 * Escribe la página de restauración en el estado de mokuro.
 * `page` es 1-based (API); mokuro usa `page_idx` 0-based (y admite valores
 * negativos para el estado de "portada", lo que rompe su propio updatePage
 * al recargar), así que se normaliza al rango válido.
 */
export function seedMokuroPage(
  book: Pick<Book, "variant" | "seriePath" | "path">,
  page: number,
  totalPages?: number,
): MokuroStoredSettings {
  const settings = readMokuroSettings(book);
  const maxPageIdx = totalPages && totalPages > 0 ? totalPages - 1 : Number.MAX_SAFE_INTEGER;

  let pageIdx = Math.min(Math.max(0, page - 1), maxPageIdx);

  // Normaliza a la primera página del par: progresos antiguos podían guardar la
  // segunda página de un spread (p. ej. tras usar el slider) y al reabrir el
  // lector mostraba una página desplazada.
  if (!settings.singlePageView && pageIdx > 0) {
    const isPageFirstOfPair = settings.hasCover ? (pageIdx === 0 || pageIdx % 2 === 1) : pageIdx % 2 === 0;

    if (!isPageFirstOfPair) pageIdx--;
  }

  settings.page_idx = pageIdx;

  if (settings.page2_idx > maxPageIdx) {
    settings.page2_idx = -1;
  }

  localStorage.setItem(mokuroStorageKey(book), JSON.stringify(settings));
  return settings;
}

interface InjectMokuroParams {
  iframe: HTMLIFrameElement;
  settings: ReaderConfig;
  /** Estado previo para sincronizar solo los ajustes que difieren (modo remoto). */
  storedSettings?: MokuroStoredSettings;
  onToggleToolbar: () => void;
  onLoaded?: () => void;
  /** Total de páginas del libro (para reparar estados corruptos de mokuro). */
  totalPages?: number;
}

/**
 * Inyecta el shim de YomiYasu en el documento de mokuro y aplica los ajustes.
 * Idempotente: repetir la llamada sobre el mismo documento no duplica código.
 */
export function injectMokuroShim({
  iframe,
  settings,
  storedSettings,
  onToggleToolbar,
  onLoaded,
  totalPages
}:InjectMokuroParams):void {
  const win = iframe.contentWindow;
  const doc = win?.document;

  if (!win || !doc || !doc.head || !doc.body) return;

  onLoaded?.();

  if (doc.head.querySelector("script[data-yomiyasu-shim='true']")) return;

  const domPages = doc.querySelectorAll(".pageContainer").length;
  const numPages = totalPages && totalPages > 0 ? totalPages : domPages;
  const maxPageIdx = Math.max(0, numPages - 1);

  // Página con la que reparar un estado corrupto de mokuro (page_idx negativo
  // o fuera de rango, que deja el lector en negro)
  const sanePageIdx = Math.min(Math.max(0, storedSettings?.page_idx ?? 0), maxPageIdx);

  const customStyles = doc.createElement("style");
  customStyles.innerHTML = mokuroStyles(window.location.origin);

  const customMokuro = doc.createElement("script");
  customMokuro.dataset.yomiyasuShim = "true";
  customMokuro.innerHTML = buildMokuroScript(settings, {sanePageIdx});

  const preload = doc.createElement("div");
  preload.id = "preload-image";

  doc.body.appendChild(preload);
  doc.head.appendChild(customMokuro);
  doc.head.appendChild(customStyles);

  // La fuente elegida por el usuario debe aplicarse también al reabrir un libro
  // (antes solo se aplicaba al cambiar el selector de fuente).
  doc.body.style.setProperty("--user-font", settings.fontFamily);

  // Muestra/oculta las barras superior/inferior con doble click
  doc.body.addEventListener("dblclick", onToggleToolbar);

  function post(property:string, value?:unknown):void {
    win?.postMessage({action:"setSettings", property, value});
  }

  // Las opciones de mokuro son toggles (un click invierte el estado), así que
  // solo se envían las que difieren del estado de partida. En remoto ese estado
  // es el que mokuro persistió para el volumen; en local el blob genera una
  // clave de storage nueva por sesión, de modo que mokuro siempre carga sus
  // valores por defecto (idénticos a defaultMokuroSettings).
  const baseline = storedSettings ?? defaultMokuroSettings();

  if (settings.r2l !== baseline.r2l) post("r2l");
  if (settings.ctrlToPan !== baseline.ctrlToPan) post("ctrlToPan");
  post("defaultZoom", settings.defaultZoomMode);
  if (settings.displayOCR !== baseline.displayOCR) post("ocr");
  if (settings.singlePageView !== baseline.singlePageView) post("doublePage");
  if (settings.hasCover !== baseline.hasCover) post("coverPage");
  if (settings.textBoxBorders !== baseline.textBoxBorders) post("borders");
  post("fontSize", settings.fontSize);
  if (settings.toggleOCRTextBoxes !== baseline.toggleOCRTextBoxes) post("toggleBoxes");
}
