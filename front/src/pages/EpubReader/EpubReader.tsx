import {ArrowLeft, CircleArrowLeft, CircleArrowRight, CircleQuestionMark, Languages, Maximize, Minimize} from "lucide-react";
import React, {useEffect, useRef, useState} from "react";
import {useTitle} from "../../lib/useTitle";
import {useNavigate, useParams, useSearchParams} from "react-router";
import {useSettingsStore} from "../../stores/SettingsStore";
import {StopWatchMenu} from "../Reader/components/StopWatchMenu";
import {useQuery} from "@tanstack/react-query";
import {Book, BookProgress} from "../../types/book";
import {api} from "../../api/api";
import {getBookProgress} from "../../helpers/ttu";
import {createProgress} from "../../helpers/progress";
import {nextBook, prevBook} from "../../helpers/book";
import {useGlobal} from "../../contexts/GlobalContext";
import {twMerge} from "tailwind-merge";
import {Dictionary} from "../Reader/components/Dictionary";
import {ShortcutItem, ShortcutsDialog} from "../Reader/components/ShortcutsDialog";
import {ReadingTimerIndicator} from "../Reader/components/ReaderChrome";
import {useFullscreen} from "../../helpers/useFullscreen";
import {IconButton} from "../../ui/IconButton";
import {Tooltip} from "../../ui/Tooltip";
import {keys} from "../../lib/queryKeys";
import {notifyReadingActivity, useIdleTimerPause, useReaderTimerStore, useReadingTimerTicker} from "../../stores/ReaderStore";

const epubShortcuts:ShortcutItem[] = [
    {keys:["t"], description:"Activar o pausar el cronómetro"},
    {keys:["f"], description:"Pantalla completa"},
    {keys:["?"], description:"Mostrar esta ayuda"},
];

async function saveProgressGlobal(bookId?:string, iframe?:HTMLIFrameElement, bookData?:Book, keepAlive = false):Promise<number> {
    if (!bookData || !bookId) return 0;
    if (!iframe || !iframe.contentWindow) return 0;

    const timer = useReaderTimerStore.getState().timer;

    // Send keydown event to the iframe para que el lector vuelque su bookmark
    iframe.contentWindow?.dispatchEvent(new KeyboardEvent("keydown", {key:"b"}));

    // El lector persiste en IndexedDB de forma asíncrona: reintentar la lectura
    const firstRead = await getBookProgress(parseInt(bookId || ""));
    await new Promise((resolve)=>setTimeout(resolve, 250));
    const secondRead = await getBookProgress(parseInt(bookId || ""));
    const currentChars = Math.max(firstRead, secondRead);

    window.localStorage.setItem(bookData._id, `${timer}`);

    void createProgress(bookData, undefined, timer, currentChars, false, parseInt(bookId || "0"), keepAlive);

    return currentChars;
}

export default function EpubReader():React.ReactElement {
    const {id} = useParams();
    const {ttuConnector} = useGlobal();
    const [searchParams] = useSearchParams();
    const bookId = searchParams.get("yomiyasuId");
    const {siteSettings, readerSettings, modifyReaderSettings} = useSettingsStore();
    const navigate = useNavigate();
    const [showToolBar, setShowToolbar] = useState(true);
    const [chars, setChars] = useState(0);
    const [changedTab, setChangedTab] = useState(false);
    const [searchWord, setSearchWord] = useState("");
    const [showShortcuts, setShowShortcuts] = useState(false);

    const {isFullscreen, toggleFullscreen} = useFullscreen();

    useReadingTimerTicker();
    useIdleTimerPause(siteSettings.idleTimeout);

    const iframe = useRef<HTMLIFrameElement>(null);

    const {data:bookData} = useQuery({
        queryKey:keys.book(bookId ?? undefined),
        queryFn:async()=>{
            const res = await api.get<Book>(`books/book/${bookId}`);
            return res;
        },
        enabled:!!bookId
    });

    useTitle(bookData ? bookData.visibleName : "Lector de novelas");

    // Ref para poder guardar desde listeners sin re-registrarlos
    const bookDataRef = useRef(bookData);
    bookDataRef.current = bookData;

    // Evita re-restaurar el cronómetro del mismo libro si la query refetchea a mitad de lectura
    const restoredBookId = useRef<string | undefined>(undefined);

    // Guarda el progreso cuando la pestaña pasa a segundo plano o se cierra
    useEffect(()=>{
        function handleHidden():void {
            if (document.visibilityState === "hidden") {
                void saveProgressGlobal(id, iframe.current ?? undefined, bookDataRef.current);
            }
        }

        function handleBeforeUnload():void {
            void saveProgressGlobal(id, iframe.current ?? undefined, bookDataRef.current, true);
        }

        document.addEventListener("visibilitychange", handleHidden);
        window.addEventListener("beforeunload", handleBeforeUnload);

        return ()=>{
            document.removeEventListener("visibilitychange", handleHidden);
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [id]);

    const {data:bookProgress} = useQuery({
        queryKey:keys.bookProgress(bookId ?? undefined),
        queryFn:async()=>{
            const res = await api.get<BookProgress>(`readprogress?book=${bookId}&status=reading`);
            return res;
        },
        refetchOnMount:false,
        refetchOnReconnect:false,
        refetchOnWindowFocus:false,
        enabled:!!bookData
    });

    useEffect(()=>{
        async function initProgress():Promise<void> {
            const currentChars = await getBookProgress(parseInt(id || ""));
            setChars(currentChars);

            if (bookProgress && restoredBookId.current !== id) {
                restoredBookId.current = id ?? undefined;
                useReaderTimerStore.getState().setTimer(bookProgress.time || 0);
            }
        }

        void initProgress();
    }, [bookProgress, id]);

    useEffect(()=>{
        function getselectedText(text:string):void {
            if (text !== "" && text !== "\n" && readerSettings.nativeDictionary) {
                document.body.style.cursor = "wait";
                setSearchWord(text);
                document.body.style.cursor = "default";
            }
        }

        function handleNewMessage(e:MessageEvent<{action:string, value:unknown}>):void {
            switch (e.data.action) {
                case "selection":{
                    const {value} = e.data as {value:string};
                    getselectedText(value);
                    break;
                }
            }
        }
        addEventListener("message", handleNewMessage);

        return () => {
            removeEventListener("message", handleNewMessage);
        };
    }, [readerSettings.nativeDictionary]);


    useEffect(() => {

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

        window.addEventListener("visibilitychange", handleOutFocus);

        return () => {
            window.removeEventListener("visibilitychange", handleOutFocus);
        };
    }, [changedTab]);

    useEffect(() => {
        function handleDoubleClick():void {
            setShowToolbar((prev) => !prev);
        }

        // Doble click fuera del iframe
        window.addEventListener("dblclick", handleDoubleClick);

        function handleKeyDown(ev:KeyboardEvent):void {
            switch (ev.key) {
                case "t":{
                    useReaderTimerStore.getState().toggle();
                    break;
                }
                case "f":{
                    toggleFullscreen();
                    break;
                }
                case "?":{
                    setShowShortcuts((prev) => !prev);
                    break;
                }
            }
        }
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("dblclick", handleDoubleClick);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [toggleFullscreen]);

    // Guarda al cumplir cada minuto, sin re-renderizar el lector
    useEffect(()=>{
        let lastSavedTimer = -1;

        return useReaderTimerStore.subscribe((state)=>{
            const {timer} = state;

            if (timer > 0 && timer % 60 === 0 && timer !== lastSavedTimer) {
                lastSavedTimer = timer;

                void (async()=>{
                    const currentChars = await saveProgressGlobal(id, iframe.current ?? undefined, bookDataRef.current);
                    setChars(currentChars);
                })();
            }
        });
    }, [id]);

    async function refreshProgress():Promise<number> {
        const currentChars = await saveProgressGlobal(id, (iframe.current || undefined), bookData);
        setChars(currentChars);
        return currentChars;
    }

    useEffect(()=>{
        if (siteSettings.autoCrono) {
            useReaderTimerStore.getState().start();
        }
    }, [siteSettings]);


    useEffect(() => {
        if (!id) {
            navigate("/");
        }
    }, [id, navigate]);

    if (!id) return <></>;

    return (
        <div className="text-app-text relative overflow-hidden h-[100svh] flex flex-col">
            <Dictionary searchWord={searchWord} setSearchWord={setSearchWord}/>
            <ShortcutsDialog open={showShortcuts} onClose={()=>setShowShortcuts(false)} shortcuts={epubShortcuts}/>
            {showToolBar && (
                <div className="bg-app-chrome w-full h-10 text-app-text flex items-center justify-between fixed top-0 gap-4 py-2 lg:py-1 z-20">
                    <div className="flex items-center gap-2 px-2 shrink lg:w-1/2">
                        <Tooltip content="Volver atrás">
                            <IconButton label="Volver atrás" onClick={async()=>{
                                await saveProgressGlobal(id, (iframe.current || undefined), bookData);

                                navigate(-1);
                            }}
                            className="text-app-text"
                            >
                                <ArrowLeft />
                            </IconButton>
                        </Tooltip>
                        <h1 className="text-lg lg:text-xl text-ellipsis overflow-hidden whitespace-nowrap max-w-[10ch] lg:max-w-[30ch]">{bookData?.visibleName}</h1>
                    </div>
                    <div className="flex items-center flex-row px-2 gap-1 grow lg:w-1/2 justify-end">
                        <Tooltip content={readerSettings.nativeDictionary ? "Desactivar diccionario nativo" : "Activar diccionario nativo"}>
                            <IconButton
                                label={readerSettings.nativeDictionary ? "Desactivar diccionario nativo" : "Activar diccionario nativo"}
                                onClick={()=>modifyReaderSettings("nativeDictionary", !readerSettings.nativeDictionary)}
                                className={readerSettings.nativeDictionary ? "text-primary" : "text-app-text"}
                            >
                                <Languages />
                            </IconButton>
                        </Tooltip>
                        <StopWatchMenu characters={chars} oldProgress={bookProgress}
                            refreshProgress={refreshProgress}
                            bookData={bookData}
                        />
                        <Tooltip content="Atajos de teclado (?)">
                            <IconButton label="Atajos de teclado" onClick={()=>setShowShortcuts(true)} className="text-app-text">
                                <CircleQuestionMark />
                            </IconButton>
                        </Tooltip>
                        <Tooltip content={isFullscreen ? "Salir de pantalla completa (f)" : "Pantalla completa (f)"}>
                            <IconButton label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"} onClick={toggleFullscreen} className="text-app-text">
                                {isFullscreen ? <Minimize /> : <Maximize />}
                            </IconButton>
                        </Tooltip>
                    </div>
                </div>
            )}
            <div className={twMerge("select-none", showToolBar ? "lg:mt-[3rem] mt-[3.5rem]" : "")}>
                <iframe className={twMerge("w-full", showToolBar ? "h-[calc(100svh-7rem)] lg:h-[calc(100svh-5.5rem)]" : "h-screen")} ref={iframe} src={`/ebook/b?id=${id}`}
                    onLoad={(e)=>{
                        const iframeWindow = e.currentTarget.contentWindow;

                        // El documento del iframe se reemplaza al navegar: registrar aquí
                        iframeWindow?.document.addEventListener("dblclick", ()=>{
                            setShowToolbar((prev)=>!prev);
                        });

                        // Actividad de lectura (pasar página, scroll): latido del cronómetro
                        iframeWindow?.addEventListener("keydown", notifyReadingActivity, {passive:true});
                        iframeWindow?.addEventListener("pointerdown", notifyReadingActivity, {passive:true});
                        iframeWindow?.addEventListener("wheel", notifyReadingActivity, {passive:true});
                        iframeWindow?.addEventListener("touchstart", notifyReadingActivity, {passive:true});
                        iframeWindow?.addEventListener("scroll", notifyReadingActivity, {passive:true, capture:true});
                    }}
                />
            </div>
            <ReadingTimerIndicator enabled={siteSettings.showCrono}/>
            {showToolBar && !!bookData && (
                <div className="bg-app-chrome h-10 w-full dark:text-app-text flex justify-between items-center fixed bottom-0 py-2 lg:py-0" >
                    <div className="justify-between flex items-center">
                        <Tooltip content="Ir al siguiente libro">
                            <IconButton label="Ir al siguiente libro" onClick={async()=>{
                                await saveProgressGlobal(id, (iframe.current || undefined), bookData);
                                void nextBook({book:bookData, variant:"novela", connector:ttuConnector, navigate});
                            }}
                            className="text-app-text"
                            >
                                <CircleArrowLeft />
                            </IconButton>
                        </Tooltip>
                    </div>
                    <div className="justify-between flex items-center">
                        <Tooltip content="Ir al libro anterior">
                            <IconButton label="Ir al libro anterior" onClick={async()=>{
                                await saveProgressGlobal(id, (iframe.current || undefined), bookData);
                                void prevBook({book:bookData, variant:"novela", connector:ttuConnector, navigate});
                            }}
                            className="text-app-text"
                            >
                                <CircleArrowRight />
                            </IconButton>
                        </Tooltip>
                    </div>
                </div>
            )}
        </div>
    );
}