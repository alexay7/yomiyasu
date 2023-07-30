import React, {createContext, useContext, useEffect, useState} from "react";
import {ContextProps} from "./AuthContext";
import socket from "../api/socket";

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

    function forceReload(key:string):void {
        setReload(key);
        setTimeout(()=>{
            setReload("");
        }, 500);
    }

    useEffect(() => {
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
    }, []);

    return (
        <GlobalContext.Provider value={{forceReload:forceReload, reloaded:reload}}>
            {children}
        </GlobalContext.Provider>
    );
}