import { twMerge } from "tailwind-merge";

export type ClassValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ClassValue[]
  | { [key: string]: boolean | null | undefined };

function collect(value: ClassValue, out: string[]): void {
  if (value === null || value === undefined || typeof value === "boolean" || value === "") return;

  if (typeof value === "string" || typeof value === "number") {
    out.push(String(value));
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collect(item, out);
    return;
  }

  for (const [key, active] of Object.entries(value)) {
    if (active) out.push(key);
  }
}

/** Combina clases condicionalmente y resuelve conflictos de Tailwind. */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];

  for (const input of inputs) collect(input, out);

  return twMerge(out.join(" "));
}
