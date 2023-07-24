import React, {createContext, useContext, useEffect, useState} from "react";
import {ContextProps} from "./AuthContext";
import socket from "../api/socket";

type GlobalContexType = {
    forceReload:()=>void,
    reloaded:boolean
};

export const GlobalContext = createContext<GlobalContexType>({} as GlobalContexType);

export function useGlobal():GlobalContexType {
    return useContext(GlobalContext);
}

export function GlobalProvider(props:ContextProps):React.ReactElement {
    const {children} = props;
    const [reload, setReload] = useState(false);

    function forceReload():void {
        setReload(true);
        setTimeout(()=>{
            setReload(false);
        }, 500);
    }

    useEffect(() => {
        socket.on("notification", (data:{action:string}) => {
            switch (data.action) {
                case "LIBRARY_UPDATE":{
                    // Si el backend ha notificado cambios en la biblioteca, actualizar la interfaz
                    forceReload();
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