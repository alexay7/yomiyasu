import {Bug, LogOut, Moon, Settings, Sun} from "lucide-react";
import {Link} from "react-router";
import {useAuth} from "../../contexts/AuthContext";
import {setColorMode, useIsDarkMode} from "../../lib/colorMode";
import {cn} from "../../ui/cn";
import {Separator} from "../../ui/Separator";
import {Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle} from "../../ui/Sheet";
import {isItemActive, activityNav, systemNav} from "./navigation";
import {useLocation} from "react-router";

interface MoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenSettings: () => void;
  onOpenAccount: () => void;
}

export function MoreSheet({open, onOpenChange, onOpenSettings, onOpenAccount}:MoreSheetProps):React.ReactElement {
  const {userData, logoutUser} = useAuth();
  const isDark = useIsDarkMode();
  const {pathname} = useLocation();

  function close():void {
    onOpenChange(false);
  }

  function toggleTheme():void {
    setColorMode(!isDark);
  }

  const sections = [activityNav, systemNav];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Más</SheetTitle>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-1">
          {sections.map((section)=>{
            const items = section.items.filter((item)=>!item.adminOnly || userData?.admin);

            if (items.length === 0) return null;

            return (
              <div key={section.title} className="flex flex-col">
                <p className="px-1 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-fg-muted/80">
                  {section.title}
                </p>
                {items.map((item)=>(
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={close}
                    className={cn(
                      "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                      isItemActive(item, pathname) ? "bg-tint text-fg" : "text-fg-muted hover:bg-tint hover:text-fg",
                    )}
                  >
                    <item.icon className="size-[18px] shrink-0" />
                    {item.label}
                  </Link>
                ))}
              </div>
            );
          })}

          <Separator className="my-2" />

          <button
            type="button"
            onClick={()=>{
              close();
              onOpenSettings();
            }}
            className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-fg-muted transition-colors hover:bg-tint hover:text-fg"
          >
            <Settings className="size-[18px]" />
            Ajustes
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-fg-muted transition-colors hover:bg-tint hover:text-fg"
          >
            {isDark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
            {isDark ? "Activar modo claro" : "Activar modo oscuro"}
          </button>
          <button
            type="button"
            onClick={()=>window.open("https://github.com/alexay7/yomiyasu/issues/new", "_blank")?.focus()}
            className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-fg-muted transition-colors hover:bg-tint hover:text-fg"
          >
            <Bug className="size-[18px]" />
            Reportar fallos
          </button>
          <button
            type="button"
            onClick={async()=>{
              close();
              await logoutUser();
            }}
            className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
          >
            <LogOut className="size-[18px]" />
            Cerrar sesión
          </button>

          <Separator className="my-2" />

          <button
            type="button"
            onClick={()=>{
              close();
              onOpenAccount();
            }}
            className="flex h-12 items-center gap-3 rounded-lg px-2 text-left transition-colors hover:bg-tint"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold uppercase text-white">
              {userData?.username?.charAt(0) ?? "?"}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium text-fg">{userData?.username}</span>
              <span className="text-xs text-fg-muted">Ajustes de cuenta</span>
            </span>
          </button>
          <p className="px-2 pb-1 text-[11px] text-fg-muted">YomiYasu {APP_VERSION}</p>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
