import React, {createContext, useContext, useEffect, useState} from "react";
import {ContextProps} from "./AuthContext";
import socket from "../api/socket";
import {useSettingsStore} from "../stores/SettingsStore";

type GlobalContexType = {
    forceReload:(v:string)=>void,
    reloaded:string
};

export const GlobalContext = createContext<GlobalContexType>({} as GlobalContexType);

export function useGlobal():GlobalContexType {
    return useContext(GlobalContext);
}

export function GlobalProvider(props:ContextProps):React.ReactElement {
    const {children} = props;
    const [reload, setReload] = useState("");
    const {siteSettings, setSiteSettings, setReaderSettings} = useSettingsStore();

    function forceReload(key:string):void {
        setReload(key);
        setTimeout(()=>{
            setReload("");
        }, 500);
    }

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
        <GlobalContext.Provider value={{forceReload:forceReload, reloaded:reload}}>
            {children}
        </GlobalContext.Provider>
    );
}