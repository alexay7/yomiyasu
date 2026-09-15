import {useCallback} from "react";
import {useNavigate} from "react-router";
import {useGlobal} from "../contexts/GlobalContext";
import {openNovel} from "../helpers/ttu";
import {confirmDialog} from "../stores/ConfirmStore";
import {useSettingsStore} from "../stores/SettingsStore";
import type {BookWithProgress} from "../types/book";
import {mokuroHtmlUrl, mokuroStorageKey} from "./media";

interface OpenBookOptions {
  /** Abrir en una pestaña nueva (click central). */
  mouse?: boolean;
  /** Modo incógnito: no se guarda progreso. */
  incognito?: boolean;
  /** Pedir confirmación si el volumen ya estaba completado. */
  confirmReread?: boolean;
}

/**
 * Apertura de un volumen respetando el modo "abrir HTML directamente" y el
 * lector nativo (manga) o el lector de novelas (ttú).
 */
export function useOpenBook(): (book: BookWithProgress, options?: OpenBookOptions) => Promise<void> {
  const navigate = useNavigate();
  const {ttuConnector, ensureTtuLoaded} = useGlobal();
  const {siteSettings} = useSettingsStore();

  return useCallback(async (book: BookWithProgress, options: OpenBookOptions = {}): Promise<void> => {
    const {mouse = false, incognito = false, confirmReread = true} = options;

    if (book.variant === "manga" || book.mokured) {
      if (siteSettings.openHTML) {
        const htmlUrl = mokuroHtmlUrl(book);

        // El HTML estático necesita el fondo oscuro persistido en mokuro
        const storageKey = mokuroStorageKey(book);
        let settings: {backgroundColor?: string} = {};

        try {
          const previous = window.localStorage.getItem(storageKey);
          if (previous) {
            settings = JSON.parse(previous) as {backgroundColor?: string};
          }
        } catch {
          // Configuración previa corrupta: se regenera
        }

        settings.backgroundColor = "#121212";
        window.localStorage.setItem(storageKey, JSON.stringify(settings));

        if (mouse) {
          window.open(htmlUrl, "_blank")?.focus();
          return;
        }

        window.location.href = htmlUrl;
        return;
      }

      if (confirmReread && book.status === "completed" && !incognito) {
        if (!await confirmDialog("Ya has leído este volumen. ¿Quieres iniciar un nuevo progreso de lectura?")) return;
      }

      const link = incognito ? `/reader/${book._id}?private=true` : `/reader/${book._id}`;

      if (mouse) {
        window.open(link, "_blank")?.focus();
        return;
      }

      navigate(link);
      return;
    }

    // Novela EPUB
    await ensureTtuLoaded();
    await openNovel(ttuConnector, book, mouse, incognito);
  }, [navigate, siteSettings, ttuConnector, ensureTtuLoaded]);
}
