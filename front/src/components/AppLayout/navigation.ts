import {
  BookOpen,
  CalendarDays,
  ChartPie,
  Clock,
  House,
  Images,
  Languages,
  type LucideIcon,
  ShieldCheck,
  WifiOff,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Coincidencia exacta de ruta (para el índice de /app). */
  end?: boolean;
  adminOnly?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const primaryNav: NavSection = {
  title: "Biblioteca",
  items: [
    {label: "Inicio", to: "/app", icon: House, end: true},
    {label: "Mangas", to: "/app/library/manga", icon: Images},
    {label: "Novelas", to: "/app/library/novels", icon: BookOpen},
  ],
};

export const activityNav: NavSection = {
  title: "Actividad",
  items: [
    {label: "Historial", to: "/app/history", icon: Clock},
    {label: "Calendario", to: "/app/calendar", icon: CalendarDays},
    {label: "Estadísticas", to: "/app/profile", icon: ChartPie},
    {label: "Palabras guardadas", to: "/app/words", icon: Languages},
  ],
};

export const systemNav: NavSection = {
  title: "Sistema",
  items: [
    {label: "Lector local", to: "/offline", icon: WifiOff},
    {label: "Administración", to: "/app/admin", icon: ShieldCheck, adminOnly: true},
  ],
};

export function isItemActive(item: NavItem, pathname: string): boolean {
  if (item.end) return pathname === item.to || pathname === `${item.to}/`;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}
