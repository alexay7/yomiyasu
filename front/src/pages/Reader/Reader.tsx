import React, {useCallback, useEffect, useRef, useState} from "react";
import {useNavigate, useParams} from "react-router";
import {useQuery} from "@tanstack/react-query";
import {api} from "../../api/api";
import {Book, BookProgress} from "../../types/book";
import {ReaderSettings} from "./components/ReaderSettings";
import {createProgress} from "../../helpers/progress";
import {PageText} from "./components/PageText";
import {Dictionary} from "./components/Dictionary";
import {nextBook, prevBook} from "../../helpers/book";
import {useTitle} from "../../lib/useTitle";
import {useAuth} from "../../contexts/AuthContext";
import {getCookie} from "../../helpers/cookies";
import {useSettingsStore} from "../../stores/SettingsStore";
import RemoteReader from "./components/RemoteReader";
import LocalReader from "./components/LocalReader";
import ImageReader from "./components/ImageReader";
import {toast} from "react-toastify";
import {useFullscreen} from "../../helpers/useFullscreen";
import {ShortcutItem, ShortcutsDialog} from "./components/ShortcutsDialog";
import {confirmDialog} from "../../stores/ConfirmStore";
import {keys} from "../../lib/queryKeys";
import {readMokuroSettings, seedMokuroPage} from "../../lib/mokuro";
import {notifyReadingActivity, useIdleTimerPause, useReaderTimerStore, useReadingTimerTicker} from "../../stores/ReaderStore";

const mangaShortcuts:ShortcutItem[] = [
    {keys:["←", "Espacio"], description:"Página anterior (izquierda)"},
    {keys:["→"], description:"Página siguiente (derecha)"},
    {keys:["t"], description:"Activar o pausar el cronómetro"},
    {keys:["p"], description:"Mostrar u ocultar el panel de texto"},
    {keys:["d"], description:"Activar o desactivar la doble página"},
    {keys:["z"], description:"Activar o desactivar Zoom y Pan"},
    {keys:["m"], description:"Cambiar el modo de zoom"},
    {keys:["f"], description:"Pantalla completa"},
    {keys:["?"], description:"Mostrar esta ayuda"},
];

// Los tomos de imágenes no tienen panel de texto ni OCR
const imageShortcuts:ShortcutItem[] = mangaShortcuts.filter(
    (shortcut) => !shortcut.keys.includes("p")
);

type ReaderProps = {
    type:"local",
    localHtml:string,
    iframeOnLoad:()=>void,
    pages:number,
    localIframe:React.RefObject<HTMLIFrameElement | null>,
    name:string,
    resetBook:()=>void
} | {
    type:"remote"
}

function Reader(props:ReaderProps):React.ReactElement {
    const {id} = useParams();
    const navigate = useNavigate();
    let iframe = useRef<HTMLIFrameElement>(null);

    if(props.type === "local" && props.localIframe){
        iframe = props.localIframe;
    }

    const {readerSettings, siteSettings, modifyReaderSettings} = useSettingsStore();
    const {reauth} = useAuth();
    const {toggleFullscreen} = useFullscreen();

    const [currentPage, setCurrentPage] = useState(1);
    const [doublePages, setDoublePages] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [pageText, setPageText] = useState<string[][][][]>([]);
    const [openTextSidebar, setOpenTextSidebar] = useState(false);
    const [searchWord, setSearchWord] = useState("");
    const [changedTab, setChangedTab] = useState(false);
    const [forceSave, setForceSave] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);

    const {data:bookData} = useQuery({
        queryKey:keys.book(id),
        queryFn:async()=> {
            const res = await api.get<Book>(`books/book/${id}`);
            return res;
        },
        enabled:!!id
    });

    useTitle(bookData ? bookData.visibleName : "Lector");

    // Tomo sin mokuro: lector de imágenes en lugar del iframe
    const isImageBook = bookData?.format === "images";

    const {data:bookProgress, isLoading} = useQuery({
        queryKey:keys.bookProgress(id),
        queryFn:async()=>{
            const res = await api.get<BookProgress>(`readprogress?book=${id}&status=reading`);
            return res;
        },
        refetchOnMount:false,
        refetchOnReconnect:false,
        refetchOnWindowFocus:false,
        enabled:!!id
    });

    useReadingTimerTicker();
    useIdleTimerPause(siteSettings.idleTimeout);

    const saveProgress = useCallback(async(keepAlive = false):Promise<void> => {
        if (!bookData) return;

        const timer = useReaderTimerStore.getState().timer;

        window.localStorage.setItem(bookData._id, `${timer}`);
        await createProgress(bookData, currentPage, timer, bookData.pageChars ? bookData.pageChars[currentPage - 1] : 0,
            !readerSettings.singlePageView, undefined, keepAlive);
    }, [bookData, currentPage, readerSettings.singlePageView]);

    const saveProgressRef = useRef(saveProgress);
    saveProgressRef.current = saveProgress;

    // Evita re-restaurar el cronómetro/página del mismo libro si las queries
    // refetchean a mitad de lectura (reconexión, LIBRARY_UPDATE, etc.)
    const restoredBookId = useRef<string | undefined>(undefined);

    useEffect(()=>{
        if(!id) return;

        const logged = getCookie("logged");

        if (!logged) {
            reauth(true);
        }
    }, [id, reauth]);

    // Guarda al cumplir cada minuto de lectura, sin re-renderizar el lector
    useEffect(()=>{
        let lastSavedTimer = -1;

        return useReaderTimerStore.subscribe((state)=>{
            const {timer} = state;

            if (timer > 0 && timer % 60 === 0 && timer !== lastSavedTimer) {
                lastSavedTimer = timer;
                void saveProgressRef.current();
            }
        });
    }, []);

    // Guardado forzado antes de cambiar de libro o salir
    useEffect(()=>{
        if (!forceSave) return;

        setForceSave(false);
        void saveProgressRef.current();
    }, [forceSave]);

    useEffect(()=>{
        if (siteSettings.autoCrono) {
            useReaderTimerStore.getState().start();
        }
    }, [siteSettings]);

    useEffect(()=>{
        if (isLoading || !bookData) return;
        if (restoredBookId.current === bookData._id) return;

        restoredBookId.current = bookData._id;

        useReaderTimerStore.getState().setTimer(bookProgress && bookProgress.time && bookProgress.time !== 0 ? bookProgress.time : parseInt(window.localStorage.getItem(bookData._id) || "0"));

        // La API guarda páginas 1-based; mokuro usa page_idx 0-based
        const page = bookProgress && bookProgress.currentPage ? bookProgress.currentPage : 1;
        seedMokuroPage(bookData, page, bookData.pages);
        setCurrentPage(page);
    }, [bookProgress, bookData, isLoading]);

    useEffect(() => {
        if(!id)return;

        const handleBeforeUnload = ():void => {
            // Guardado de salida: keepalive para que la petición sobreviva al cierre
            void saveProgressRef.current(true);
        };

        const handleOutFocus = ():void=>{
            const {timerOn} = useReaderTimerStore.getState();

            if (document.visibilityState === "hidden" && timerOn) {
                useReaderTimerStore.getState().pause();
                setChangedTab(true);
            }
            if (changedTab && document.visibilityState === "visible" && !timerOn) {
                useReaderTimerStore.getState().start();
                setChangedTab(false);
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        window.addEventListener("visibilitychange", handleOutFocus);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            window.removeEventListener("visibilitychange", handleOutFocus);
        };
    }, [bookData, currentPage, changedTab, readerSettings,id, navigate, modifyReaderSettings, toggleFullscreen, siteSettings]);

    useEffect(()=>{
        /**
         * Cuando se tengan los datos del libro del backend, se analiza el localstorage para ver
         * la configuración anterior del volumen. Los tomos de imágenes no tienen
         * estado de mokuro que restaurar.
         */
        if (bookData && bookData.format !== "images") {
            const stored = readMokuroSettings(bookData);
            setDoublePages(!stored.singlePageView);
            setCurrentPage(Math.max(1, (stored.page_idx ?? 0) + 1));
        }
    }, [bookData]);

    useEffect(()=>{
        // Define la altura del document según la altura de la pantalla FIX IOS
        document.documentElement.style.setProperty("--height", `${window.innerHeight}px`);

        function getselectedText(text:string):void {
            if (text !== "" && text !== "\n" && readerSettings.nativeDictionary) {
                document.body.style.cursor = "wait";
                setSearchWord(text);
                document.body.style.cursor = "default";
            }
        }

        function handleKeyDown(e:KeyboardEvent):void {
            // El lector de imágenes gestiona sus propios atajos
            if (isImageBook) return;

            const target = e.target as HTMLElement | null;

            if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;

            switch (e.key) {
                case "ArrowLeft":{
                    iframe.current?.contentWindow?.postMessage({action:"goLeft"});
                    break;
                }
                case " ":{
                    iframe.current?.contentWindow?.postMessage({action:"goLeft"});
                    break;
                }
                case "ArrowRight":{
                    iframe.current?.contentWindow?.postMessage({action:"goRight"});
                    break;
                }
                case "t":{
                    useReaderTimerStore.getState().toggle();
                    break;
                }
                case "p":{
                    setOpenTextSidebar((prev)=>!prev);
                    break;
                }
                case "d":{
                    iframe.current?.contentWindow?.postMessage({action:"setSettings", property:"doublePage"});
                    toast.success(`Doble página ${readerSettings.singlePageView ? "activada" : "desactivada"}`);
                    modifyReaderSettings("singlePageView", !readerSettings.singlePageView);
                    break;
                }
                case "z":{
                    if (readerSettings.panAndZoom) {
                        iframe.current?.contentWindow?.postMessage({action:"setSettings", property:"disableZoom"});
                        toast.success("Zoom&Pan desactivado");
                    } else {
                        iframe.current?.contentWindow?.postMessage({action:"setSettings", property:"enableZoom"});
                        toast.success("Zoom&Pan activado");
                    }
                    modifyReaderSettings("panAndZoom", !readerSettings.panAndZoom);
                    break;
                }
                case "m":{
                    const zooms = ["fit to screen", "fit to width", "original size", "keep zoom level"];
                    const zoomIndex = zooms.indexOf(readerSettings.defaultZoomMode);
                    const newZoom = zoomIndex < 3 ? zooms[zoomIndex + 1] : zooms[0];
                    iframe.current?.contentWindow?.postMessage({action:"setSettings", property:"defaultZoom", value:newZoom});
                    modifyReaderSettings("defaultZoomMode", newZoom as "fit to screen" | "fit to width" | "original size" | "keep zoom level");
                    toast.success(`Nuevo modo de zoom: ${newZoom}`);
                    break;
                }
                case "f":{
                    toggleFullscreen();
                    break;
                }
                case "?":{
                    setShowShortcuts((prev)=>!prev);
                    break;
                }
            }
        }

        async function handleNewMessage(e:MessageEvent<{action:string, value:unknown}>):Promise<void> {
            switch (e.data.action) {
                case "newPage": {
                    const {value} = e.data as {value:number};
                    if (value || value === 0) {
                        notifyReadingActivity();

                        if(bookData){
                            if ((value < -1 && !readerSettings.singlePageView) || (value < 0 && readerSettings.singlePageView)) {
                                if (!await confirmDialog("¿Volver al libro anterior?")) return;
                                setForceSave(true);

                                // Wait 500 ms
                                setTimeout(()=>{
                                    void prevBook({book:bookData, variant:"manga", navigate});
                                }, 500);
                                return;
                            }
                            if (value >= bookData.pages) {
                                if (!await confirmDialog("¿Pasar al siguiente libro?")) return;
                                setForceSave(true);

                                // Wait 500 ms
                                setTimeout(()=>{
                                    void nextBook({book:bookData, variant:"manga", navigate});
                                }, 500);

                                return;
                            }
                        }

                        if (siteSettings.startCronoOnPage && !useReaderTimerStore.getState().timerOn) {
                            useReaderTimerStore.getState().start();
                        }

                        setCurrentPage(value + 1);
                    }
                    break;
                }
                case "text":{
                    const {value} = e.data as {value:string[][][][]};
                    setPageText(value);
                    break;
                }
                case "selection":{
                    const {value} = e.data as {value:string};
                    getselectedText(value);
                    break;
                }
                case "keypress":{
                    const {value} = e.data as {value:KeyboardEvent};
                    if (value.key === "ArrowLeft" || value.key === "ArrowRight" || value.key === " ") return;
                    const event = new KeyboardEvent("keydown", {key:value.key});
                    window.dispatchEvent(event);

                    break;
                }
            }
        }

        function handleMouseUp(event:MouseEvent):void {
            if (!readerSettings.nativeDictionary) return;
            if (readerSettings.dictionaryVersion === "word") {
                if (!event.target) return;
                const target = event.target as HTMLElement;
                const text = target.textContent;
                // Check if the target has the data dontsearch attribute
                const searchable = target.getAttribute("data-searchable");
                if (!text || target.tagName !== "P" || !searchable) return;
                const clickedPosition = window.getSelection()?.focusOffset; // Obtiene la posición del clic
                if (clickedPosition !== undefined) {
                    const extracted = text.slice(clickedPosition);
                    setSearchWord(extracted);
                }
            } else {
                const target = event.target as HTMLElement;
                const searchable = target.getAttribute("data-searchable");
                if (!searchable) return;
                const selection = window.getSelection();
                if (selection && selection.toString() && readerSettings.nativeDictionary) {
                    getselectedText(selection.toString());
                    selection.removeAllRanges();
                }
            }
        }

        function handleTouchUp(e:TouchEvent):void {
            if (readerSettings.dictionaryVersion === "word") {
                if (!e.target) return;
                const target = e.target as HTMLElement;
                const text = target.textContent;
                // Check if the target has the data dontsearch attribute
                const searchable = target.getAttribute("data-searchable");
                if (!text || target.tagName !== "P" || !searchable) return;
                const clickedPosition = window.getSelection()?.focusOffset; // Obtiene la posición del clic
                if (clickedPosition) {
                    const extracted = text.slice(clickedPosition);
                    setSearchWord(extracted);
                }
            } else {
                e.stopImmediatePropagation();
                const target = e.target as HTMLElement;
                const searchable = target.getAttribute("data-searchable");
                if (!searchable) return;
                const selection = window.getSelection();
                if (selection && selection.toString()) {
                // Dar tiempo a quitar el dedo
                    setTimeout(()=>{
                        getselectedText(selection.toString());
                        selection.removeAllRanges();
                    }, 200);
                }
            }
        }

        function handleResize():void {
            const doc = document.documentElement;
            doc.style.setProperty("--height", `${window.innerHeight}px`);
        }

        // Recibe mensajes del iframe
        addEventListener("message", handleNewMessage);

        // Detectar clicks en pc (solo el lector de mokuro tiene texto seleccionable)
        if (!isImageBook) {
            if (readerSettings.dictionaryVersion === "word") {
                addEventListener("click", handleMouseUp);
            } else {
                addEventListener("mouseup", handleMouseUp);
            }

            // Detectar clicks en móviles
            addEventListener("touchend", handleTouchUp);
        }

        // Sirve para calcular la altura en dispositivos móviles
        addEventListener("resize", handleResize);

        // Permite cambiar de página con keybinds
        addEventListener("keydown", handleKeyDown);

        return ()=>{
            removeEventListener("message", handleNewMessage);
            if (!isImageBook) {
                if (readerSettings.dictionaryVersion === "word") {
                    removeEventListener("click", handleMouseUp);
                } else {
                    removeEventListener("mouseup", handleMouseUp);
                }
                removeEventListener("touchend", handleTouchUp);
            }
            removeEventListener("resize", handleResize);
            removeEventListener("keydown", handleKeyDown);
        };
    }, [bookData, isImageBook, readerSettings, siteSettings, navigate, modifyReaderSettings, toggleFullscreen]);

    function closeSettingsMenu():void {
        setShowSettings(false);
    }

    return (
        <div className="text-app-text relative overflow-hidden h-[100svh] flex flex-col">
            {(isImageBook || (iframe.current && iframe.current.contentWindow)) && (
                <ReaderSettings showMenu={showSettings} closeSettings={closeSettingsMenu}
                    iframeWindow={isImageBook ? null : iframe.current?.contentWindow}
                    mode={isImageBook ? "images" : "mokuro"}
                />
            )}
            <PageText lines={pageText} open={openTextSidebar} setOpen={setOpenTextSidebar}/>
            <Dictionary searchWord={searchWord} setSearchWord={setSearchWord}/>
            <ShortcutsDialog open={showShortcuts} onClose={()=>setShowShortcuts(false)} shortcuts={isImageBook ? imageShortcuts : mangaShortcuts}/>
            {bookData && !isLoading && (
                isImageBook ? (
                    <ImageReader readerVars={{bookData,bookProgress,currentPage,setCurrentPage,showSettings,setShowSettings,setShowShortcuts,saveProgress}}/>
                ) : (
                    <RemoteReader readerVars={{bookData,bookProgress,currentPage,iframe,showSettings,setShowSettings,doublePages,setOpenTextSidebar,setShowShortcuts,saveProgress}}/>
                )
            )}
            {props.type === "local" && (
                <LocalReader readerVars={{currentPage,iframe,showSettings,setShowSettings,setOpenTextSidebar,localHtml:props.localHtml,pages:props.pages,iframeOnLoad:props.iframeOnLoad,name:props.name,resetBook:props.resetBook}}/>
            )}
        </div>
    );
}

export default Reader;