import React, {useEffect, useRef, useState} from "react";
import {useParams} from "react-router-dom";
import {useQuery} from "react-query";
import {api} from "../../api/api";
import {Book, BookProgress} from "../../types/book";
import {ReaderSettings} from "./components/ReaderSettings";
import {createProgress} from "../../helpers/progress";
import {PageText} from "./components/PageText";
import {Dictionary} from "./components/Dictionary";
import {nextBook, prevBook} from "../../helpers/book";
import {Helmet} from "react-helmet";
import {useAuth} from "../../contexts/AuthContext";
import {getCookie} from "../../helpers/cookies";
import "./styles.css";
import {useSettingsStore, defaultSets} from "../../stores/SettingsStore";
import RemoteReader from "./components/RemoteReader";
import LocalReader from "./components/LocalReader";

type ReaderProps = {
    type:"local",
    localHtml:string,
    iframeOnLoad:()=>void,
    pages:number,
    localIframe:React.RefObject<HTMLIFrameElement>,
    name:string,
    resetBook:()=>void
} | {
    type:"remote"
}

function Reader(props:ReaderProps):React.ReactElement {
    const {id} = useParams();
    let iframe = useRef<HTMLIFrameElement>(null);

    if(props.type === "local" && props.localIframe){
        iframe = props.localIframe;
    }

    const {readerSettings, siteSettings} = useSettingsStore();
    const {reauth} = useAuth();

    const [currentPage, setCurrentPage] = useState(1);
    const [doublePages, setDoublePages] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [pageText, setPageText] = useState<string[][][][]>([]);
    const [timer, setTimer] = useState(0);
    const [timerOn, setTimerOn] = useState(false);
    const [openTextSidebar, setOpenTextSidebar] = useState(false);
    const [searchWord, setSearchWord] = useState("");
    const [changedTab, setChangedTab] = useState(false);
    const [forceSave, setForceSave] = useState(false);
    
    const [bookData,setBookData]=useState<Book|undefined>(undefined);

    useQuery("book", async()=> {
        const res = await api.get<Book>(`books/book/${id}`);
        return res;
    },{enabled:!!id,onSuccess:(data)=>setBookData(data)});

    const {data:bookProgress, isLoading} = useQuery(`progress-${id}`, async()=>{
        const res = await api.get<BookProgress>(`readprogress?book=${id}&status=reading`);
        return res;
    }, {refetchOnMount:false, refetchOnReconnect:false, refetchOnWindowFocus:false, enabled:!!id});

    useEffect(()=>{
        if(!id) return;

        const logged = getCookie("logged");

        if (!logged) {
            reauth(true);
        }

        if (!bookData || (timer % 60 !== 0 || timer === 0)&&!forceSave) return;
        window.localStorage.setItem(bookData._id, `${timer}`);
        void createProgress(bookData, currentPage, timer, bookData.pageChars ? bookData.pageChars[currentPage - 1] : 0,
            !readerSettings.singlePageView);
        setForceSave(false);
    }, [currentPage, timer, bookData, reauth, readerSettings,id,forceSave]);

    useEffect(()=>{
        if (siteSettings.autoCrono) {
            setTimerOn(true);
        }
    }, [siteSettings, setTimerOn]);

    useEffect(()=>{
        function replaceWindowSelection():Selection | null {
            if (window.document.getSelection()) {
                return window.document.getSelection();
            }

            if (iframe.current && iframe.current.contentWindow) {

                const realSelection = iframe.current.contentWindow.getSelection();
                return realSelection;
            }

            return null;
        }

        window.getSelection = replaceWindowSelection;

        if (!isLoading && bookData) {
            let page = 1;

            setTimer(bookProgress && bookProgress.time && bookProgress.time !== 0 ? bookProgress.time : parseInt(window.localStorage.getItem(bookData._id) || "0"));

            if (bookProgress && bookProgress.currentPage) {
                page = bookProgress.currentPage;
            }

            const initial = defaultSets() as {page_idx:number};

            initial.page_idx = page;
            window.localStorage.setItem(`mokuro_/api/static/${bookData.variant}s/${encodeURI(bookData.seriePath)}/${encodeURI(bookData.path)}.html`, JSON.stringify(initial));

            setCurrentPage(page - 1);
        }
    }, [bookProgress, bookData, isLoading]);

    useEffect(() => {
        if(!id)return;

        const handleBeforeUnload = async():Promise<void> => {
            // Save before leaving the page
            if (!bookData) return;
            await createProgress(bookData, currentPage, timer, bookData.pageChars ? bookData.pageChars[currentPage - 1] : 0,
                !readerSettings.singlePageView);
        };

        const handleOutFocus = ():void=>{
            if (document.visibilityState === "hidden" && timerOn) {
                setTimerOn(false);
                setChangedTab(true);
            }
            if (changedTab && document.visibilityState === "visible" && !timerOn) {
                setTimerOn(true);
                setChangedTab(false);
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        window.addEventListener("visibilitychange", handleOutFocus);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            window.removeEventListener("visibilitychange", handleOutFocus);
        };
    }, [bookData, currentPage, timer, timerOn, changedTab, readerSettings,id]);

    useEffect(()=>{
        /**
         * Cuando se tengan los datos del libro del backend, se analiza el localstorage para ver
         * la configuración anterior del volumen
         */
        if (bookData) {
            const rawProgress = window.localStorage.getItem(`mokuro_/api/static/${bookData.variant}s/${encodeURI(bookData.seriePath)}/${encodeURI(bookData.path)}.html`) as string;
            if (rawProgress) {
                const progress = JSON.parse(rawProgress) as {"page_idx":number, "singlePageView":boolean};
                setDoublePages(!progress.singlePageView);
                setCurrentPage(progress.page_idx);
            }
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
                    setTimerOn((prev)=>!prev);
                    break;
                }
                case "p":{
                    setOpenTextSidebar((prev)=>!prev);
                    break;
                }
            }
        }

        function handleNewMessage(e:MessageEvent<{action:string, value:unknown}>):void {
            switch (e.data.action) {
                case "newPage": {
                    const {value} = e.data as {value:number};
                    if (value || value === 0) {
                        if(bookData){
                            if ((value < -1 && !readerSettings.singlePageView) || (value < 0 && readerSettings.singlePageView)) {
                                if (!confirm("¿Volver al libro anterior?")) return;
                                setForceSave(true);

                                // Wait 500 ms
                                setTimeout(()=>{
                                    void prevBook({book:bookData, variant:"manga"});
                                }, 500);
                                return;
                            }
                            if (value >= bookData.pages) {
                                if (!confirm("¿Pasar al siguiente libro?")) return;
                                setForceSave(true);

                                // Wait 500 ms
                                setTimeout(()=>{
                                    void nextBook({book:bookData, variant:"manga"});
                                }, 500);

                                return;
                            }
                        }

                        if (siteSettings.startCronoOnPage && !timerOn) {
                            setTimerOn(true);
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

        // Detectar clicks en pc
        if (readerSettings.dictionaryVersion === "word") {
            addEventListener("click", handleMouseUp);
        } else {
            addEventListener("mouseup", handleMouseUp);
        }

        // Detectar clicks en móviles
        addEventListener("touchend", handleTouchUp);

        // Sirve para calcular la altura en dispositivos móviles
        addEventListener("resize", handleResize);

        // Permite cambiar de página con keybinds
        addEventListener("keydown", handleKeyDown);

        return ()=>{
            removeEventListener("message", handleNewMessage);
            if (readerSettings.dictionaryVersion === "word") {
                removeEventListener("click", handleMouseUp);
            } else {
                removeEventListener("mouseup", handleMouseUp);
            }
            removeEventListener("touchend", handleTouchUp);
            removeEventListener("resize", handleResize);
            removeEventListener("keydown", handleKeyDown);
        };
    }, [bookData, readerSettings, siteSettings, timerOn]);

    function closeSettingsMenu():void {
        setShowSettings(false);
    }

    return (
        <div className="text-[#0000008a] relative overflow-hidden h-[100svh] flex flex-col">
            <Helmet>
                <title>{`YomiYasu - ${bookData ? bookData.visibleName : "lector"}`}</title>
            </Helmet>
            {iframe && iframe.current && iframe.current.contentWindow && (
                <ReaderSettings showMenu={showSettings} closeSettings={closeSettingsMenu}
                    iframeWindow={iframe.current.contentWindow}
                />
            )}
            <PageText lines={pageText} open={openTextSidebar} setOpen={setOpenTextSidebar}/>
            <Dictionary searchWord={searchWord} setSearchWord={setSearchWord}/>
            {bookData && (
                <RemoteReader readerVars={{bookData,bookProgress,currentPage,iframe,showSettings,setShowSettings,timer,setTimerOn,setTimer,timerOn,doublePages,setOpenTextSidebar}}/>
            )}
            {props.type === "local" && (
                <LocalReader readerVars={{currentPage,iframe,showSettings,setShowSettings,timer,setTimer,timerOn,setTimerOn,setOpenTextSidebar,localHtml:props.localHtml,pages:props.pages,iframeOnLoad:props.iframeOnLoad,name:props.name,resetBook:props.resetBook}}/>
            )}
        </div>
    );
}

export default Reader;