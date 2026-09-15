import React, {createContext, useCallback, useContext, useEffect, useRef, useState} from "react";
import type {Socket} from "socket.io-client";
import {ContextProps} from "./AuthContext";
import {useSettingsStore} from "../stores/SettingsStore";
import {useNavigate} from "react-router";
import {findBookId} from "../helpers/ttu";
import {invalidateLibraryUpdate} from "../lib/invalidate";

type GlobalContexType = {
    ttuConnector:React.RefObject<HTMLIFrameElement | null>;
    /**
     * Monta (si hace falta) el iframe del lector de novelas y espera a que
     * cargue. Se usa antes de enviarle un EPUB por postMessage.
     */
    ensureTtuLoaded:()=>Promise<void>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const GlobalContext = createContext<GlobalContexType>({} as GlobalContexType);

// eslint-disable-next-line react-refresh/only-export-components
export function useGlobal():GlobalContexType {
    return useContext(GlobalContext);
}

/** Tiempo máximo de espera si /ebook no responde (el lector de novelas no está disponible). */
const TTU_LOAD_TIMEOUT = 8000;

export function GlobalProvider(props:ContextProps):React.ReactElement {
    const {children} = props;
    const {siteSettings, setSiteSettings, setReaderSettings, modifySiteSettings} = useSettingsStore();

    const navigate = useNavigate();

    const ttuConnector = useRef<HTMLIFrameElement>(null);

    // El iframe del lector de novelas solo se monta cuando se abre una novela
    const [ttuRequested, setTtuRequested] = useState(false);
    const ttuLoadPromise = useRef<Promise<void> | null>(null);
    const ttuResolve = useRef<(() => void) | null>(null);

    const ensureTtuLoaded = useCallback(():Promise<void> => {
        if (ttuLoadPromise.current) return ttuLoadPromise.current;

        ttuLoadPromise.current = new Promise<void>((resolve)=>{
            ttuResolve.current = resolve;
        });

        setTtuRequested(true);

        // Si el lector no está disponible, no bloquear la apertura de la novela
        window.setTimeout(()=>{
            ttuResolve.current?.();
            ttuResolve.current = null;
        }, TTU_LOAD_TIMEOUT);

        return ttuLoadPromise.current;
    }, []);

    useEffect(()=>{
        if (siteSettings.mainView === undefined) {
            modifySiteSettings("mainView", "both");
        }
    }, [modifySiteSettings, siteSettings.mainView]);

    useEffect(() => {
        async function handleMessage(e:MessageEvent):Promise<void> {
            if (e.data.event === "finished") {


                if (!e.data.bookId) {
                    const id = await findBookId(e.data.title);
                    if (id) {
                        e.data.bookId = id;
                    }
                }

                let link = `/ranobe/${e.data.bookId}?yomiyasuId=${e.data.yomiyasuId}`;

                if (e.data.incognito) {
                    link += "&private=true";
                }

                if (e.data.mouse) {
                    window.open(link, "_blank")?.focus();
                    return;
                }

                if (siteSettings.openHTML) {
                    window.location.href = `/ebook/b?id=${e.data.bookId}`;
                    return;
                }

                navigate(link);
            }
        }

        window.addEventListener("message", handleMessage);

        return () => {
            window.removeEventListener("message", handleMessage);
        };
    }, [navigate, siteSettings]);

    useEffect(() => {
        // Limpia el almacenamiento de mokuro
        if (!siteSettings || !siteSettings.openHTML) {
            const keys = Object.keys(localStorage);
            keys.forEach((key)=>{
                if (key.includes("mokuro")) {
                    localStorage.removeItem(key);
                }
            });
        }

        // socket.io se carga de forma diferida: solo hace falta para avisos
        let cancelled = false;
        let socketInstance: Socket | undefined;

        function handleNotification(data:{action:string}):void {
            if (data.action === "LIBRARY_UPDATE") {
                // Si el backend ha notificado cambios en la biblioteca, invalidar la caché
                invalidateLibraryUpdate();
            }
        }

        void import("../api/socket").then(({default: importedSocket})=>{
            if (cancelled) return;
            socketInstance = importedSocket;
            socketInstance.on("notification", handleNotification);
        });

        return () => {
            cancelled = true;
            socketInstance?.off("notification", handleNotification);
        };
    }, [siteSettings]);

    useEffect(()=>{
        const prevSiteSettings = localStorage.getItem("site");
        if (prevSiteSettings) {
            setSiteSettings(JSON.parse(prevSiteSettings));
            localStorage.removeItem("site");
        }

        const prevReaderSettings = localStorage.getItem("reader");
        if (prevReaderSettings) {
            setReaderSettings(JSON.parse(prevReaderSettings));
            localStorage.removeItem("reader");
        }
    }, [setSiteSettings, setReaderSettings]);

    return (
        <GlobalContext.Provider value={{ttuConnector, ensureTtuLoaded}}>
            {children}
            {ttuRequested ? (
                <iframe
                    ref={ttuConnector}
                    src="/ebook/manage"
                    className="hidden"
                    onLoad={()=>{
                        ttuResolve.current?.();
                        ttuResolve.current = null;
                    }}
                />
            ) : null}
        </GlobalContext.Provider>
    );
}
