import {create} from "zustand";
import {createJSONStorage, persist} from "zustand/middleware";

import {ReaderConfig, SiteConfig} from "../types/settings";

interface SettingsState {
    readerSettings:ReaderConfig;
    setReaderSettings:(v:ReaderConfig)=>void;
    modifyReaderSettings:<K extends keyof ReaderConfig>(key:K, value:ReaderConfig[K])=>void;
    siteSettings:SiteConfig;
    setSiteSettings:(v:SiteConfig)=>void;
    modifySiteSettings:<K extends keyof SiteConfig>(key:K, value:SiteConfig[K])=>void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set, get) => ({
            readerSettings: {
                fontFamily: "IPA",
                r2l: true,
                ctrlToPan: true,
                defaultZoomMode: "fit to screen",
                displayOCR: true,
                singlePageView: false,
                hasCover: true,
                textBoxBorders: false,
                fontSize: "auto",
                toggleOCRTextBoxes: true,
                panAndZoom: true,
                nativeDictionary: true,
                dictionaryVersion: "word",
                scrollChange: true
            },
            setReaderSettings: (v) => set({readerSettings:v}),
            modifyReaderSettings: (key, value) => set({readerSettings: {...get().readerSettings, [key]: value}}),
            siteSettings: {
                openHTML: false,
                bookView: "characters",
                autoCrono: false,
                antispoilers: false,
                startCronoOnPage: false,
                mainView: "both"
            },
            setSiteSettings: (v) => set({siteSettings:v}),
            modifySiteSettings: (key, value) => set({siteSettings: {...get().siteSettings, [key]: value}})
        }),
        {
            name:"yomiyasu-settings",
            storage:createJSONStorage(()=>localStorage),
            merge: (source, target) => {
                const prev = source as SettingsState;
                return {...target, ...prev};
            }
        }
    )
);

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