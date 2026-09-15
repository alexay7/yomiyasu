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

  settings.page_idx = Math.min(Math.max(0, page - 1), maxPageIdx);

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
  /** Lector local: activa el OCR al abrir. */
  clickDisplayOcr?: boolean;
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
  clickDisplayOcr = false,
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
  customStyles.innerHTML = mokuroStyles;

  const customMokuro = doc.createElement("script");
  customMokuro.dataset.yomiyasuShim = "true";
  customMokuro.innerHTML = buildMokuroScript(settings, {
    ...(clickDisplayOcr ? {clickDisplayOcr:true} : {}),
    sanePageIdx
  });

  const preload = doc.createElement("div");
  preload.id = "preload-image";

  doc.body.appendChild(preload);
  doc.head.appendChild(customMokuro);
  doc.head.appendChild(customStyles);

  // Muestra/oculta las barras superior/inferior con doble click
  doc.body.addEventListener("dblclick", onToggleToolbar);

  function post(property:string, value?:unknown):void {
    win?.postMessage({action:"setSettings", property, value});
  }

  if (storedSettings) {
    // Solo enviar los ajustes que difieren del estado que mokuro ya tiene
    if (settings.r2l !== storedSettings.r2l) post("r2l");
    if (settings.ctrlToPan !== storedSettings.ctrlToPan) post("ctrlToPan");
    post("defaultZoom", settings.defaultZoomMode);
    if (settings.displayOCR !== storedSettings.displayOCR) post("ocr");
    if (settings.singlePageView !== storedSettings.singlePageView) post("doublePage");
    if (settings.hasCover !== storedSettings.hasCover) post("coverPage");
    if (settings.textBoxBorders !== storedSettings.textBoxBorders) post("borders");
    post("fontSize", settings.fontSize);
    if (settings.toggleOCRTextBoxes !== storedSettings.toggleOCRTextBoxes) post("toggleBoxes");
  } else {
    // Lector local: aplicar todo sin comparar
    post("r2l");
    post("ctrlToPan");
    post("defaultZoom", settings.defaultZoomMode);
    post("ocr");
    post("doublePage");
    post("coverPage");
    post("borders");
    post("fontSize", settings.fontSize);
    post("toggleBoxes");
  }
}
