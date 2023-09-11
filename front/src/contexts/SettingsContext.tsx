import React, {createContext, useContext, useEffect, useState} from "react";
import {FullReaderConfig, ReaderConfig, SiteConfig} from "../types/settings";
import {ContextProps} from "./AuthContext";
import {useMediaQuery} from "react-responsive";

type SettingsContextType = {
    readerSettings:ReaderConfig;
    setReaderSettings:(v:React.SetStateAction<ReaderConfig>)=>void;
    siteSettings:SiteConfig;
    setSiteSettings:(v:React.SetStateAction<SiteConfig>)=>void;
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
        toggleOCRTextBoxes: false,
        openHTML:false
    };
}

export function SettingsProvider(props:ContextProps):React.ReactElement {
    const {children} = props;
    const isTabletOrMobile = useMediaQuery({query: "(max-width: 1224px)"});

    const defaultReaderSettings:FullReaderConfig = {
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
        panAndZoom:!isTabletOrMobile, // Si el usuario está usando móvil es más cómodo no usar el zoom
        nativeDictionary:true,
        dictionaryVersion:"word",
        scrollChange:true
    };

    const rawUserSettings = window.localStorage.getItem("reader");

    let userSettings:null | ReaderConfig = null;
    if (rawUserSettings) {
        userSettings = JSON.parse(rawUserSettings) as ReaderConfig;

        // Adjustments for 2.0
        if (userSettings.nativeDictionary === undefined) {
            userSettings.nativeDictionary = true;
        }

        if (userSettings.dictionaryVersion === undefined) {
            userSettings.dictionaryVersion = "word";
        }

        if (userSettings.dictionaryVersion === undefined) {
            userSettings.scrollChange = true;
        }
    }

    const defaultSiteSettings:SiteConfig = {
        openHTML:false,
        bookView:"pages",
        autoCrono:true,
        antispoilers:false
    };

    const rawSiteSettings = window.localStorage.getItem("site");
    let auxSiteSettings:null | SiteConfig = null;
    if (rawSiteSettings) {
        auxSiteSettings = JSON.parse(rawSiteSettings) as SiteConfig;
    }

    const [readerSettings, setReaderSettings] = useState<ReaderConfig>(userSettings || defaultReaderSettings);
    const [siteSettings, setSiteSettings] = useState<SiteConfig>(auxSiteSettings || defaultSiteSettings);

    useEffect(()=>{
        console.log(readerSettings);
        window.localStorage.setItem("reader", JSON.stringify(readerSettings));
    }, [readerSettings]);

    useEffect(()=>{
        window.localStorage.setItem("site", JSON.stringify(siteSettings));
    }, [siteSettings]);

    // Limpia el almacenamiento de mokuro
    if (!auxSiteSettings || !auxSiteSettings.openHTML) {
        const keys = Object.keys(localStorage);
        keys.forEach((key)=>{
            if (key.includes("mokuro")) {
                localStorage.removeItem(key);
            }
        });
    }

    return (
        <SettingsContext.Provider value={{
            readerSettings:readerSettings,
            setReaderSettings:setReaderSettings,
            siteSettings:siteSettings,
            setSiteSettings:setSiteSettings
        }}
        >
            {children}
        </SettingsContext.Provider>
    );
}