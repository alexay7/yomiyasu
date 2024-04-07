import {ArrowBack, ArrowCircleLeft, ArrowCircleRight, Timer} from "@mui/icons-material";
import {IconButton, Tooltip} from "@mui/material";
import React, {useEffect, useRef, useState} from "react";
import {Helmet} from "react-helmet";
import {useNavigate, useParams, useSearchParams} from "react-router-dom";
import {useSettingsStore} from "../../stores/SettingsStore";
import {StopWatchMenu} from "../Reader/components/StopWatchMenu";
import {useQuery} from "react-query";
import {Book, BookProgress} from "../../types/book";
import {api} from "../../api/api";
import {getBookProgress} from "../../helpers/ttu";
import {createProgress} from "../../helpers/progress";
import {nextBook, prevBook} from "../../helpers/book";
import {useGlobal} from "../../contexts/GlobalContext";
import {twMerge} from "tailwind-merge";
import {Dictionary} from "../Reader/components/Dictionary";

async function saveProgressGlobal(timer:number, bookId?:string, iframe?:HTMLIFrameElement, bookData?:Book):Promise<number> {
    if (!bookData || !bookId) return 0;
    if (!iframe || !iframe.contentWindow) return 0;

    // Send keydown event to the iframe
    iframe.contentWindow?.dispatchEvent(new KeyboardEvent("keydown", {key:"b"}));

    const currentChars = await getBookProgress(parseInt(bookId || ""));

    window.localStorage.setItem(bookData._id, `${timer}`);

    void createProgress(bookData, undefined, timer, currentChars, false, parseInt(bookId || "0"));

    return currentChars;
}

export default function EpubReader():React.ReactElement {
    const {id} = useParams();
    const {ttuConnector} = useGlobal();
    const [searchParams] = useSearchParams();
    const bookId = searchParams.get("yomiyasuId");
    const {siteSettings} = useSettingsStore();
    const navigate = useNavigate();
    const [showToolBar, setShowToolbar] = useState(true);
    const [timer, setTimer] = useState(0);
    const [timerOn, setTimerOn] = useState(false);
    const [chars, setChars] = useState(0);
    const [changedTab, setChangedTab] = useState(false);
    const [searchWord, setSearchWord] = useState("");

    const iframe = useRef<HTMLIFrameElement>(null);

    const {data:bookData} = useQuery(["book", bookId], async()=> {
        const res = await api.get<Book>(`books/book/${bookId}`);
        return res;
    });

    const {data:bookProgress} = useQuery(`progress-${bookId}`, async()=>{
        const res = await api.get<BookProgress>(`readprogress?book=${bookId}&status=reading`);
        return res;
    }, {refetchOnMount:false, refetchOnReconnect:false, refetchOnWindowFocus:false, enabled:!!bookData,
        onSuccess:async(data)=>{
            const currentChars = await getBookProgress(parseInt(id || ""));
            setChars(currentChars);

            if (!data) return;

            setTimer(data.time || 0);
        }
    });

    useEffect(()=>{
        function getselectedText(text:string):void {
            if (text !== "" && text !== "\n") {
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
    }, []);


    useEffect(() => {

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

        window.addEventListener("visibilitychange", handleOutFocus);

        return () => {
            window.removeEventListener("visibilitychange", handleOutFocus);
        };
    }, [changedTab, timerOn]);

    useEffect(() => {
        if (!iframe.current) return;

        const ifr = iframe.current;

        function handleDoubleClick():void {
            setShowToolbar((prev) => !prev);
        }

        // Muestra/oculta las barras superior/inferior haciendo doble click al documento
        ifr.contentWindow?.document.addEventListener("dblclick", handleDoubleClick);

        return () => {
            ifr.contentWindow?.document.removeEventListener("dblclick", handleDoubleClick);
        };
    }, [iframe]);

    useEffect(() => {
        function handleDoubleClick():void {
            setShowToolbar((prev) => !prev);
        }
        window.addEventListener("dblclick", handleDoubleClick);

        function handleKeyDown(ev:KeyboardEvent):void {
            switch (ev.key) {
                case "p":{
                    setTimerOn((prev) => !prev);
                    break;
                }
            }
        }
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("dblclick", handleDoubleClick);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    useEffect(()=>{
        if (timer % 60 !== 0 || timer === 0) return;

        async function saveProgress():Promise<void> {
            const currentChars =   await saveProgressGlobal(timer, id, (iframe.current || undefined), bookData);
            setChars(currentChars);
        }

        void saveProgress();
    }, [timer, bookData, id]);

    async function refreshProgress():Promise<number> {
        const currentChars =   await saveProgressGlobal(timer, id, (iframe.current || undefined), bookData);
        setChars(currentChars);
        return currentChars;
    }

    useEffect(()=>{
        if (siteSettings.autoCrono) {
            setTimerOn(true);
        }
    }, [siteSettings, setTimerOn]);

    useEffect(() => {
        const timerInterval = setInterval(()=>{
            if (timerOn) {
                setTimer((prev)=>{
                    return (prev + 1);
                });
            }
        }, 1000);
        return () => clearInterval(timerInterval);
    }, [timerOn, setTimer]);

    if (!id) {
        navigate("/");
        return <></>;
    }

    return (
        <div className="text-[#0000008a] relative overflow-hidden h-[100svh] flex flex-col">
            <Helmet>
                <title>{`YomiYasu - ${bookData ? bookData.visibleName : "lector"}`}</title>
            </Helmet>
            <Dictionary searchWord={searchWord} setSearchWord={setSearchWord}/>
            {showToolBar && (
                <div className="dark:bg-[#101010] bg-[#ebe8e3] w-full h-10 dark:text-[#ebe8e3] text-[#0000008a] flex items-center justify-between fixed top-0 gap-4 py-2 lg:py-1 z-20">
                    <div className="flex items-center gap-2 px-2 shrink lg:w-1/2">
                        <Tooltip title="Volver atrás">
                            <IconButton onClick={async()=>{
                                await saveProgressGlobal(timer, id, (iframe.current || undefined), bookData);

                                window.location.href = window.localStorage.getItem("origin") || "/app";
                            }}
                            className="dark:text-[#ebe8e3] text-[#0000008a]"
                            >
                                <ArrowBack/>
                            </IconButton>
                        </Tooltip>
                        <h1 className="text-lg lg:text-xl text-ellipsis overflow-hidden whitespace-nowrap max-w-[10ch] lg:max-w-[30ch]">{bookData?.visibleName}</h1>
                    </div>
                    <div className="flex items-center flex-row px-2 gap-1 grow lg:w-1/2 justify-end">
                        <StopWatchMenu characters={chars} oldProgress={bookProgress}
                            timer={timer} setTimer={setTimer}
                            timerOn={timerOn} setTimerOn={setTimerOn}
                            refreshProgress={refreshProgress}
                            bookData={bookData}
                        />
                    </div>
                </div>
            )}
            <div className={twMerge("select-none", showToolBar ? "lg:mt-[3rem] mt-[3.5rem]" : "")}>
                <iframe className={twMerge("w-full", showToolBar ? "h-[calc(100svh-7rem)] lg:h-[calc(100svh-5.5rem)]" : "h-screen")} ref={iframe} src={`/ebook/b?id=${id}`}/>
            </div>
            {siteSettings.showCrono && timerOn && (
                <div className="opacity-60 z-10">
                    <Timer className="text-primary w-6 h-6 animate-pulse absolute top-2 right-2"/>
                </div>
            )}
            {showToolBar && !!bookData && (
                <div className="dark:bg-[#101010] bg-[#ebe8e3] h-10 w-full dark:text-[#ebe8e3] flex justify-between items-center fixed bottom-0 py-2 lg:py-0" >
                    <div className="justify-between flex items-center">
                        <Tooltip title="Ir al siguiente libro">
                            <IconButton onClick={async()=>{
                                await saveProgressGlobal(timer, id, (iframe.current || undefined), bookData);
                                void nextBook({book:bookData, variant:"novela", connector:ttuConnector});
                            }}
                            className="dark:text-[#ebe8e3] text-[#0000008a]"
                            >
                                <ArrowCircleLeft/>
                            </IconButton>
                        </Tooltip>
                    </div>
                    <div className="justify-between flex items-center">
                        <Tooltip title="It al libro anterior">
                            <IconButton onClick={async()=>{
                                await saveProgressGlobal(timer, id, (iframe.current || undefined), bookData);
                                void prevBook({book:bookData, variant:"novela", connector:ttuConnector});
                            }}
                            className="dark:text-[#ebe8e3] text-[#0000008a]"
                            >
                                <ArrowCircleRight/>
                            </IconButton>
                        </Tooltip>
                    </div>
                </div>
            )}
        </div>
    );
}