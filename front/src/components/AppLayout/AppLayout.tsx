import {Search} from "lucide-react";
import React, {lazy, Suspense, useEffect, useState} from "react";
import {Outlet, useNavigate} from "react-router";
import {useAuth} from "../../contexts/AuthContext";
import {useSettingsStore} from "../../stores/SettingsStore";
import {Kbd} from "../../ui/Kbd";
import {MobileTabBar} from "./MobileTabBar";
import {Sidebar} from "./Sidebar";

// Los overlays (búsqueda, ajustes, cuenta, más) se cargan bajo demanda
const GlobalSearch = lazy(() => import("./GlobalSearch").then((m)=>({default:m.GlobalSearch})));
const SettingsSheet = lazy(() => import("./SettingsSheet").then((m)=>({default:m.SettingsSheet})));
const AccountSheet = lazy(() => import("./AccountSheet").then((m)=>({default:m.AccountSheet})));
const MoreSheet = lazy(() => import("./MoreSheet").then((m)=>({default:m.MoreSheet})));

export default function AppLayout():React.ReactElement {
    const {sidebarCollapsed, setSidebarCollapsed, setOpenSettings} = useSettingsStore();
    const {userData} = useAuth();
    const navigate = useNavigate();

    const [searchOpen, setSearchOpen] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);

    useEffect(()=>{
        function handleKeyDown(e:KeyboardEvent):void {
            if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;

            const target = e.target as HTMLElement | null;

            if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;

            e.preventDefault();
            setSearchOpen(true);
        }

        window.addEventListener("keydown", handleKeyDown);

        return ()=>window.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
        <div className="flex h-[100svh] overflow-hidden bg-app-bg">
            <Sidebar
                collapsed={sidebarCollapsed}
                onToggleCollapsed={()=>setSidebarCollapsed(!sidebarCollapsed)}
                onOpenSettings={()=>setOpenSettings(true)}
                onOpenAccount={()=>setAccountOpen(true)}
            />

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="flex h-16 shrink-0 items-center gap-2 border-b border-app-border bg-app-chrome px-3 lg:px-4">
                    <button
                        type="button"
                        onClick={()=>navigate("/app")}
                        className="rounded-lg px-1 text-lg font-bold tracking-tight text-fg transition-colors hover:text-primary lg:hidden"
                    >
                        YomiYasu
                    </button>

                    <button
                        type="button"
                        onClick={()=>setSearchOpen(true)}
                        className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 text-sm text-fg-muted transition-colors hover:border-accent/60 hover:text-fg lg:max-w-md"
                        aria-label="Buscar en la biblioteca"
                    >
                        <Search className="size-4 shrink-0" />
                        <span className="flex-1 truncate text-left">Busca series o libros…</span>
                        <Kbd className="hidden sm:inline-flex">/</Kbd>
                    </button>

                    <button
                        type="button"
                        onClick={()=>setMoreOpen(true)}
                        className="ml-auto flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-semibold uppercase text-white lg:hidden"
                        aria-label="Más opciones"
                    >
                        {userData?.username?.charAt(0) ?? "?"}
                    </button>
                </header>

                <main className="min-h-0 flex-1 overflow-y-auto">
                    <Outlet/>
                </main>

                <MobileTabBar onOpenMore={()=>setMoreOpen(true)} />
            </div>

            <Suspense fallback={null}>
                {searchOpen ? <GlobalSearch open onOpenChange={setSearchOpen} /> : null}
                {moreOpen ? (
                    <MoreSheet
                        open
                        onOpenChange={setMoreOpen}
                        onOpenSettings={()=>setOpenSettings(true)}
                        onOpenAccount={()=>setAccountOpen(true)}
                    />
                ) : null}
                <SettingsSheet />
                {accountOpen ? <AccountSheet open onOpenChange={setAccountOpen} /> : null}
            </Suspense>
        </div>
    );
}
