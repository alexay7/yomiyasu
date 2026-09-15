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
    openSettings:boolean;
    setOpenSettings:(v:boolean)=>void;
    sidebarCollapsed:boolean;
    setSidebarCollapsed:(v:boolean)=>void;
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
                mainView: "both",
                showCrono: false,
                kindleEmail: undefined,
                libraryLimit: "25"
            },
            setSiteSettings: (v) => set({siteSettings:v}),
            modifySiteSettings: (key, value) => set({siteSettings: {...get().siteSettings, [key]: value}}),
            openSettings: false,
            setOpenSettings: (v) => set({openSettings: v}),
            sidebarCollapsed: false,
            setSidebarCollapsed: (v) => set({sidebarCollapsed: v})
        }),
        {
            name:"yomiyasu-settings",
            storage:createJSONStorage(()=>localStorage),
            // openSettings es estado efímero de UI: no debe restaurarse entre sesiones
            partialize: (state) => ({
                readerSettings: state.readerSettings,
                siteSettings: state.siteSettings,
                sidebarCollapsed: state.sidebarCollapsed
            }),
            merge: (source, target) => {
                const prev = source as SettingsState;
                return {...target, ...prev, openSettings: false};
            }
        }
    )
);
