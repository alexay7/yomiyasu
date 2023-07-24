import React, {createContext, useContext, useEffect, useState} from "react";
import {FullReaderConfig, ReaderConfig} from "../types/settings";
import {ContextProps} from "./AuthContext";
import {useMediaQuery} from "react-responsive";

type SettingsContextType = {
    readerSettings:ReaderConfig;
    setReaderSettings:(v:React.SetStateAction<ReaderConfig>)=>void
};

export const SettingsContext = createContext<SettingsContextType>({} as SettingsContextType);

export function useSettings():SettingsContextType {
    return useContext(SettingsContext);
}

export function defaultSets():unknown {
    return {
        page_idx: 0,
        page2_idx: -1,
        hasCover: false,
        r2l: true,
        singlePageView: false,
        ctrlToPan: false,
        textBoxBorders: false,
        editableText: false,
        displayOCR: true,
        fontSize: "auto",
        eInkMode: false,
        defaultZoomMode: "fit to screen",
        toggleOCRTextBoxes: false
    };
}

export function SettingsProvider(props:ContextProps):React.ReactElement {
    const {children} = props;
    const isTabletOrMobile = useMediaQuery({query: "(max-width: 1224px)"});

    const defaultSettings:FullReaderConfig = {
        page_idx:1,
        page2_idx:-1,
        fontFamily:"IPA",
        r2l:true,
        ctrlToPan:true,
        defaultZoomMode:"fit to screen",
        displayOCR:true,
        singlePageView:isTabletOrMobile, //si el usuario usa móvil es más cómodo página simple
        hasCover:true,
        textBoxBorders:false,
        fontSize:"auto",
        toggleOCRTextBoxes:true,
        panAndZoom:!isTabletOrMobile // Si el usuario está usando móvil es más cómodo no usar el zoom
    };

    const rawUserSettings = window.localStorage.getItem("reader");
    let userSettings:null | ReaderConfig = null;
    if (rawUserSettings) {
        userSettings = JSON.parse(rawUserSettings) as ReaderConfig;
    }

    const [readerSettings, setReaderSettings] = useState<ReaderConfig>(userSettings || defaultSettings);

    useEffect(()=>{
        window.localStorage.setItem("reader", JSON.stringify(readerSettings));
    }, [readerSettings]);

    return (
        <SettingsContext.Provider value={{
            readerSettings:readerSettings,
            setReaderSettings:setReaderSettings}}
        >
            {children}
        </SettingsContext.Provider>
    );
}