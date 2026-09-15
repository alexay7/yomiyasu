import {useSyncExternalStore} from "react";

/**
 * Modo de color basado en la clase `dark` del documento, compartido por todos
 * los consumidores sin necesidad de contexto (el script anti-FOUC de
 * index.html ya deja la clase aplicada antes del primer render).
 */

const STORAGE_KEY = "color-theme";

function subscribe(callback: () => void): () => void {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {attributes: true, attributeFilter: ["class"]});
  return () => observer.disconnect();
}

function getSnapshot(): boolean {
  return document.documentElement.classList.contains("dark");
}

export function useIsDarkMode(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}

export function setColorMode(dark: boolean): void {
  if (dark) {
    document.documentElement.classList.add("dark");
    document.documentElement.style.backgroundColor = "#1E1E1E";
  } else {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.backgroundColor = "white";
  }

  window.localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
}
