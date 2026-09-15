import {Bug, ChevronLeft, LogOut, Moon, Settings, Sun, type LucideIcon} from "lucide-react";
import {NavLink, useLocation, useNavigate} from "react-router";
import {useAuth} from "../../contexts/AuthContext";
import {setColorMode, useIsDarkMode} from "../../lib/colorMode";
import {cn} from "../../ui/cn";
import {IconButton} from "../../ui/IconButton";
import {Tooltip} from "../../ui/Tooltip";
import {activityNav, isItemActive, primaryNav, systemNav, type NavItem, type NavSection} from "./navigation";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenSettings: () => void;
  onOpenAccount: () => void;
}

export function Sidebar({collapsed, onToggleCollapsed, onOpenSettings, onOpenAccount}: SidebarProps):React.ReactElement {
  const {userData, logoutUser} = useAuth();
  const isDark = useIsDarkMode();
  const navigate = useNavigate();

  function toggleTheme():void {
    setColorMode(!isDark);
  }

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-app-border bg-app-sidebar transition-[width] duration-200 lg:flex",
        collapsed ? "w-[4.25rem]" : "w-60",
      )}
    >
      <div className={cn("flex h-16 shrink-0 items-center gap-1 px-3", collapsed ? "justify-center" : "justify-between")}>
        <button
          type="button"
          onClick={()=>navigate("/app")}
          className={cn(
            "rounded-lg font-bold tracking-tight text-fg transition-colors hover:text-primary",
            collapsed ? "text-lg" : "px-2 text-xl",
          )}
          aria-label="Ir al inicio"
        >
          {collapsed ? "Y" : "YomiYasu"}
        </button>
        {!collapsed ? (
          <IconButton label="Contraer menú" size="sm" onClick={onToggleCollapsed}>
            <ChevronLeft />
          </IconButton>
        ) : null}
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-2">
        <SidebarSection section={primaryNav} collapsed={collapsed} />
        <SidebarSection section={activityNav} collapsed={collapsed} />
        <SidebarSection section={systemNav} collapsed={collapsed} />
      </nav>

      <div className="flex shrink-0 flex-col gap-1 border-t border-app-border px-2 py-2">
        {collapsed ? (
          <SidebarAction icon={ChevronLeft} label="Expandir menú" onClick={onToggleCollapsed} collapsed className="rotate-180" />
        ) : null}
        <SidebarAction icon={Settings} label="Ajustes" onClick={onOpenSettings} collapsed={collapsed} />
        <SidebarAction icon={isDark ? Sun : Moon} label={isDark ? "Activar modo claro" : "Activar modo oscuro"} onClick={toggleTheme} collapsed={collapsed} />
        <SidebarAction
          icon={Bug}
          label="Reportar fallos"
          onClick={()=>window.open("https://github.com/alexay7/yomiyasu/issues/new", "_blank")?.focus()}
          collapsed={collapsed}
        />
        <SidebarAction icon={LogOut} label="Cerrar sesión" onClick={()=>void logoutUser()} collapsed={collapsed} danger />

        <button
          type="button"
          onClick={onOpenAccount}
          className={cn(
            "mt-1 flex h-11 items-center gap-2.5 rounded-lg px-2 text-left transition-colors hover:bg-tint",
            collapsed && "justify-center px-0",
          )}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-semibold uppercase text-white">
            {userData?.username?.charAt(0) ?? "?"}
          </span>
          {!collapsed ? (
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[13px] font-medium text-fg">{userData?.username}</span>
              <span className="text-[11px] text-fg-muted">Ajustes de cuenta</span>
            </span>
          ) : null}
        </button>
        {!collapsed ? (
          <a
            href="https://github.com/alexay7/yomiyasu"
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 pb-1 text-[11px] text-fg-muted transition-colors hover:text-primary hover:no-underline"
          >
            YomiYasu {APP_VERSION}
          </a>
        ) : null}
      </div>
    </aside>
  );
}

function SidebarSection({section, collapsed}:{section:NavSection; collapsed:boolean}):React.ReactElement | null {
  const {userData} = useAuth();
  const items = section.items.filter((item)=>!item.adminOnly || userData?.admin);

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-0.5">
      {collapsed ? (
        <div className="h-2" aria-hidden />
      ) : (
        <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-fg-muted/80">
          {section.title}
        </p>
      )}
      {items.map((item)=>(
        <SidebarLink key={item.to} item={item} collapsed={collapsed} />
      ))}
    </div>
  );
}

function SidebarLink({item, collapsed}:{item:NavItem; collapsed:boolean}):React.ReactElement {
  const {pathname} = useLocation();
  const active = isItemActive(item, pathname);

  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
        collapsed && "justify-center px-0",
        active ? "bg-tint text-fg" : "text-fg-muted hover:bg-tint hover:text-fg",
      )}
    >
      {active ? (
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" aria-hidden />
      ) : null}
      <item.icon className="size-[18px] shrink-0" strokeWidth={active ? 2.4 : 2} />
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
    </NavLink>
  );

  return collapsed ? (
    <Tooltip content={item.label} side="right">
      {link}
    </Tooltip>
  ) : link;
}

interface SidebarActionProps {
  icon:LucideIcon;
  label:string;
  onClick:()=>void;
  collapsed:boolean;
  danger?:boolean;
  className?:string;
}

function SidebarAction({icon:Icon, label, onClick, collapsed, danger = false, className}:SidebarActionProps):React.ReactElement {
  const button = (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
        collapsed && "justify-center px-0",
        danger ? "text-danger hover:bg-danger/10" : "text-fg-muted hover:bg-tint hover:text-fg",
        className,
      )}
    >
      <Icon className="size-[18px] shrink-0" />
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </button>
  );

  return collapsed ? (
    <Tooltip content={label} side="right">
      {button}
    </Tooltip>
  ) : button;
}
