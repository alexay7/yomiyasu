import React, {createContext, useContext, useEffect, useRef, useState} from "react";
import {ContextProps} from "./AuthContext";
import socket from "../api/socket";
import {useSettingsStore} from "../stores/SettingsStore";
import {useNavigate} from "react-router-dom";
import {goTo} from "../helpers/helpers";
import {findBookId} from "../helpers/ttu";

type GlobalContexType = {
    forceReload:(v:string)=>void,
    reloaded:string,
    ttuConnector:React.RefObject<HTMLIFrameElement>
};

export const GlobalContext = createContext<GlobalContexType>({} as GlobalContexType);

export function useGlobal():GlobalContexType {
    return useContext(GlobalContext);
}

export function GlobalProvider(props:ContextProps):React.ReactElement {
    const {children} = props;
    const [reload, setReload] = useState("");
    const {siteSettings, setSiteSettings, setReaderSettings, modifySiteSettings} = useSettingsStore();

    const navigate = useNavigate();

    const ttuConnector = useRef<HTMLIFrameElement>(null);

    useEffect(()=>{
        if (siteSettings.mainView === undefined) {
            modifySiteSettings("mainView", "both");
        }
    }, [modifySiteSettings, siteSettings.mainView]);

    function forceReload(key:string):void {
        setReload(key);
        setTimeout(()=>{
            setReload("");
        }, 500);
    }

    useEffect(() => {
        async function handleMessage(e:MessageEvent):Promise<void> {
            if (e.data.event === "finished") {
                const bookId = await findBookId(e.data.title);

                let link = `/ranobe/${bookId}?yomiyasuId=${e.data.yomiyasuId}`;

                if (e.data.incognito) {
                    link += "&private=true";
                }

                if (e.data.mouse) {
                    window.open(link, "_blank")?.focus();
                    return;
                }

                if (siteSettings.openHTML) {
                    window.location.href = `/ebook/b?id=${bookId}`;
                    return;
                }

                goTo(navigate, link);
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

        socket.on("notification", (data:{action:string}) => {
            switch (data.action) {
                case "LIBRARY_UPDATE":{
                    // Si el backend ha notificado cambios en la biblioteca, actualizar la interfaz
                    forceReload("all");
                }
            }
        });

        return () => {
            socket.off("notification");
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
        <GlobalContext.Provider value={{forceReload:forceReload, reloaded:reload, ttuConnector}}>
            {children}
            <iframe ref={ttuConnector} src="/ebook/manage" className="hidden"/>
        </GlobalContext.Provider>
    );
}