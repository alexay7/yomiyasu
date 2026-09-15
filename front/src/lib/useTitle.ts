import { useEffect } from "react";

const SUFFIX = " · YomiYasu";

/** Gestiona document.title durante el ciclo de vida del componente. */
export function useTitle(title?: string): void {
  useEffect(() => {
    if (!title) return;

    const previous = document.title;
    document.title = `${title}${SUFFIX}`;

    return () => {
      document.title = previous;
    };
  }, [title]);
}
