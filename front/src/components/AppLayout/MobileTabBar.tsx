import {Clock, Ellipsis, House, Images, Languages} from "lucide-react";
import {NavLink, useLocation} from "react-router";
import {cn} from "../../ui/cn";
import {isItemActive, type NavItem} from "./navigation";

const tabs = [
  {label: "Inicio", to: "/app", icon: House, end: true},
  {label: "Biblioteca", to: "/app/library/manga", icon: Images, match: "/app/library"},
  {label: "Historial", to: "/app/history", icon: Clock},
  {label: "Palabras", to: "/app/words", icon: Languages},
] as const;

interface MobileTabBarProps {
  onOpenMore: () => void;
}

export function MobileTabBar({onOpenMore}:MobileTabBarProps):React.ReactElement {
  const {pathname} = useLocation();
  const moreActive = ["/app/calendar", "/app/profile", "/offline", "/app/admin"].some((path)=>pathname.startsWith(path));

  return (
    <nav className="flex shrink-0 items-stretch border-t border-app-border bg-app-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
      {tabs.map((tab)=>{
        const item = {label: tab.label, to: tab.to, icon: tab.icon, end: "end" in tab ? tab.end : undefined} as NavItem;
        const active = "match" in tab ? pathname.startsWith(tab.match) : isItemActive(item, pathname);

        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={"end" in tab ? tab.end : undefined}
            className={cn(
              "flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
              active ? "text-primary" : "text-fg-muted",
            )}
          >
            <tab.icon className="size-5" strokeWidth={active ? 2.4 : 2} />
            {tab.label}
          </NavLink>
        );
      })}
      <button
        type="button"
        onClick={onOpenMore}
        className={cn(
          "flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
          moreActive ? "text-primary" : "text-fg-muted",
        )}
      >
        <Ellipsis className="size-5" strokeWidth={moreActive ? 2.4 : 2} />
        Más
      </button>
    </nav>
  );
}
