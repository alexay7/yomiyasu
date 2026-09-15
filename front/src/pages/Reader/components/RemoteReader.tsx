import { ArrowBack, ArrowBackIosNew, ArrowCircleLeft, ArrowCircleRight, ArrowForwardIos, Fullscreen, FullscreenExit, HelpOutline, Settings, SkipNext, SkipPrevious, Timer, Translate, ViewSidebar } from "@mui/icons-material";
import { createTheme, IconButton, ThemeProvider, Tooltip } from "@mui/material";
import React, { Fragment, SetStateAction, useEffect, useState } from "react";
import { StopWatchMenu } from "./StopWatchMenu";
import { InversedSlider } from "./InversedSlider";
import { Book, BookProgress } from "../../../types/book";
import { useSettingsStore } from "../../../stores/SettingsStore";
import { createProgress } from "../../../helpers/progress";
import { useMediaQuery } from "react-responsive";
import { nextBook, prevBook } from "../../../helpers/book";
import { ReaderConfig } from "../../../types/settings";
import { formatTime, goBack } from "../../../helpers/helpers";
import { useNavigate } from "react-router-dom";
import { useFullscreen } from "../../../helpers/useFullscreen";
import { buildMokuroScript, mokuroStyles } from "../../../helpers/mokuroScript";

type RemoteReaderProps = {
    readerVars:{
        bookData:Book;
        bookProgress?:BookProgress;
        currentPage:number;
        iframe:React.RefObject<HTMLIFrameElement>;
        showSettings:boolean;
        setShowSettings:(v:boolean)=>void;
        timer:number;
        setTimer:(v:SetStateAction<number>)=>void;
        timerOn:boolean;
        setTimerOn:(v:SetStateAction<boolean>)=>void;
        doublePages:boolean;
        setOpenTextSidebar:(v:SetStateAction<boolean>)=>void;
        setShowShortcuts:(v:SetStateAction<boolean>)=>void;
    }
}

const theme = createTheme({
    direction: "rtl"
});

export default function RemoteReader({readerVars:{bookData, currentPage,timer,bookProgress,
    setTimer,setTimerOn,timerOn,iframe,setShowSettings,doublePages,setOpenTextSidebar,setShowShortcuts
}}:RemoteReaderProps):React.ReactElement{
    const {readerSettings,siteSettings}=useSettingsStore()
    const {isFullscreen,toggleFullscreen}=useFullscreen();


    const [showTimeLeft, setShowTimeLeft] = useState(false);
    const [showToolBar, setShowToolbar] = useState(true);

    const navigate = useNavigate();

    const isTabletOrMobile = useMediaQuery({query: "(max-width: 1224px)"});

        // Función que manda orden al iframe de cambiar de página
        function setPage(newPage:number):void {
            iframe.current?.contentWindow?.postMessage({action:"setPage", page:newPage});
        }

    
        /**
         * Esta función modifica el código del script incluido en el mokuro
         * para hacerlo compatible con el formato iframe dentro de otro documento.
         */
        function injectCustomScript():void {
            if (!iframe || !iframe.current || !iframe.current.contentWindow) return;
    
            const customStyles = document.createElement("style");
    
            customStyles.innerHTML = mokuroStyles;
    
            const customMokuro = document.createElement("script");
    
            customMokuro.innerHTML = buildMokuroScript(readerSettings);
    
            const preload = document.createElement("div");
            preload.id = "preload-image";
    
            iframe.current.contentWindow.document.body.appendChild(preload);
            iframe.current.contentWindow.document.head.appendChild(customMokuro);
            iframe.current.contentWindow.document.head.appendChild(customStyles);
    
            // Muestra/oculta las barras superior/inferior haciendo doble click al documento
            iframe.current.contentWindow.document.body.addEventListener("dblclick", ()=>{
                setShowToolbar((prev)=>!prev);
            });
    
            // Establece los ajustes del usuario
            if (!bookData) return;
            const currentSettings = JSON.parse(window.localStorage.getItem(`mokuro_/api/static/${bookData.variant}s/${encodeURI(bookData.seriePath)}/${encodeURI(bookData.path)}.html`) as string) as ReaderConfig;
    
            if (readerSettings.r2l !== currentSettings.r2l) {
                iframe.current.contentWindow.postMessage({action:"setSettings", property:"r2l"});
            }
            if (readerSettings.ctrlToPan !== currentSettings.ctrlToPan) {
                iframe.current.contentWindow.postMessage({action:"setSettings", property:"ctrlToPan"});
            }
            iframe.current.contentWindow.postMessage({action:"setSettings", property:"defaultZoom", value:readerSettings.defaultZoomMode});
            if (readerSettings.displayOCR !== currentSettings.displayOCR) {
                iframe.current.contentWindow.postMessage({action:"setSettings", property:"ocr"});
            }
            if (readerSettings.singlePageView !== currentSettings.singlePageView) {
                iframe.current.contentWindow.postMessage({action:"setSettings", property:"doublePage"});
            }
            if (readerSettings.hasCover !== currentSettings.hasCover) {
                iframe.current.contentWindow.postMessage({action:"setSettings", property:"coverPage"});
            }
            if (readerSettings.textBoxBorders !== currentSettings.textBoxBorders) {
                iframe.current.contentWindow.postMessage({action:"setSettings", property:"borders"});
            }
            iframe.current.contentWindow.postMessage({action:"setSettings", property:"fontSize", value:readerSettings.fontSize});
            if (readerSettings.toggleOCRTextBoxes !== currentSettings.toggleOCRTextBoxes) {
                iframe.current.contentWindow.postMessage({action:"setSettings", property:"toggleBoxes"});
            }
        }
    
        function toggleSidebar():void {
            setOpenTextSidebar((prev)=>!prev);
        }
    
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
    
        function getTimeLeft():string {
            if (!bookData?.pageChars || !bookData.characters) return "";
    
            const readChars = bookData.pageChars[currentPage];
            const consumedTime = timer;
            let speed = readChars / consumedTime;
            if (speed <= 0) {
                speed = 1;
            }
            const charactersLeft = bookData.characters - bookData.pageChars[currentPage];
    
            return formatTime(charactersLeft / speed);
        }
    
        function calculateCharacters():number {
            if (!bookData) return 0;
    
            if (currentPage > 1) {
                if (!doublePages) {
                    return (bookData.pageChars || [0])[currentPage - 1] - (bookData.pageChars || [0])[currentPage - 2];
                }
    
                // Sumar los caracteres de las dos páginas
                return (bookData.pageChars || [0])[currentPage] - (bookData.pageChars || [0])[currentPage - 2];
    
            }
            return (bookData.pageChars || [0])[0];
        }
    
        function calculateCurrentCharacters():number {
            if (!bookData) return 0;
    
            if (currentPage > 1) {
                if (!doublePages) {
                    return (bookData.pageChars || [0])[currentPage - 1];
                }
    
                // Sumar los caracteres de las dos páginas
                return (bookData.pageChars || [0])[currentPage];
    
            }
            return (bookData.pageChars || [0])[0];
        }
    
        function getTotalPages():number {
            if (!bookData) return 0;
    
            if (readerSettings.r2l) {
                if (readerSettings.hasCover && !readerSettings.singlePageView) {
                    return bookData.pages - 1;
                }
            }
            return bookData.pages;
        }
    
        function getCurrentPage():number {
            if (currentPage === 0) return 1;
            return currentPage;
        }

    return(
        <Fragment>
        {showToolBar && (
            <div className="bg-app-chrome w-full h-[5vh] text-app-text flex items-center justify-between fixed top-0 gap-4 py-2 lg:py-1 z-20">
                <div className="flex items-center gap-2 px-2 shrink lg:w-1/2">
                    <Tooltip title="Volver atrás">
                        <IconButton onClick={async()=>{
                            await createProgress(bookData, currentPage, timer,
                                bookData.pageChars ? bookData.pageChars[currentPage - 1] : 0, !readerSettings.singlePageView);
                            goBack(navigate);
                        }}
                        className="text-app-text"
                        >
                            <ArrowBack/>
                        </IconButton>
                    </Tooltip>
                    <h1 className="text-lg lg:text-xl text-ellipsis overflow-hidden whitespace-nowrap max-w-[10ch] lg:max-w-[30ch]">{bookData.visibleName}</h1>
                </div>
                <div className="flex items-center flex-row px-2 gap-1 grow lg:w-1/2 justify-end">
                    <Tooltip enterTouchDelay={0} title={`${calculateCharacters()} caracteres`}>
                        <IconButton>
                            <Translate className="text-app-text"/>
                        </IconButton>
                    </Tooltip>
                    <StopWatchMenu characters={calculateCurrentCharacters()} oldProgress={bookProgress} bookData={bookData}
                        timer={timer} setTimer={setTimer}
                        timerOn={timerOn} setTimerOn={setTimerOn}
                        currentPage={currentPage}
                    />
                    {/* <IconButton>
                        <Translate/>
                    </IconButton> */}
                    <Tooltip title="Atajos de teclado (?)">
                        <IconButton onClick={()=>setShowShortcuts(true)}>
                            <HelpOutline className="text-app-text"/>
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={isFullscreen ? "Salir de pantalla completa (f)" : "Pantalla completa (f)"}>
                        <IconButton onClick={toggleFullscreen}>
                            {isFullscreen ? (
                                <FullscreenExit className="text-app-text"/>
                            ) : (
                                <Fullscreen className="text-app-text"/>
                            )}
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Ajustes del lector">
                        <IconButton onClick={()=>setShowSettings(true)}>
                            <Settings className="text-app-text"/>
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Mostrar caracteres por separado">
                        <IconButton onClick={toggleSidebar}>
                            <ViewSidebar className="text-app-text"/>
                        </IconButton>
                    </Tooltip>
                </div>
            </div>
        )}
        <iframe
            ref={iframe}
            src={`/api/static/${bookData.variant}s/${bookData?.seriePath}/${bookData?.path}.html`}
            className="w-full measure"
            onLoad={injectCustomScript}
        />
        {siteSettings.showCrono && timerOn && (
            <div className="opacity-60 z-10">
                <Timer className="text-primary w-6 h-6 animate-pulse absolute top-2 right-2"/>
            </div>
        )}
        {!showToolBar && isTabletOrMobile && (
            <div className="fixed bottom-0 flex justify-around items-center w-full py-2 opacity-70">
                <IconButton onClick={()=>{
                    iframe.current?.contentWindow?.postMessage({action:"goLeft"});
                }} className="w-1/3"
                >
                    <ArrowBackIosNew className="stroke-gray-600 stroke-1"/>
                </IconButton>
                <p className="text-[#ebe8e3] font-semibold text-lg" style={{textShadow:"-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black"}}>{currentPage} / {bookData.pages}</p>
                <IconButton onClick={()=>{
                    iframe.current?.contentWindow?.postMessage({action:"goRight"});
                }} className="w-1/3"
                >
                    <ArrowForwardIos className="stroke-gray-600 stroke-1"/>
                </IconButton>
            </div>
        )}
        {showToolBar && (
            <div className="bg-app-chrome h-[5vh] w-full dark:text-app-text flex justify-center items-center fixed bottom-0 py-2 lg:py-0" >
                {bookData.pageChars && (
                    <div className="absolute -top-6 right-1 text-white text-sm select-none font-bold" onClick={()=>setShowTimeLeft((prev)=>!prev)} style={{textShadow:"-1px 0 #787878, 0 1px #787878, 1px 0 #787878, 0 -1px #787878"}}>
                        {showTimeLeft ? (
                            <p><span className="text-xs">Tiempo restante estimado: {getTimeLeft()}</span></p>
                        ) : (
                            <p><span className="text-xs">Caracteres leídos:</span> {calculateCurrentCharacters()} / {bookData.characters}</p>
                        )}
                    </div>
                )}
                {readerSettings.r2l ? (
                    <div className="justify-between flex items-center">
                        <Tooltip title="Ir al siguiente libro">
                            <IconButton onClick={async()=>{
                                await createProgress(bookData, currentPage, timer,
                                    bookData.pageChars ? bookData.pageChars[currentPage - 1] : 0, !readerSettings.singlePageView);
                                void nextBook({book:bookData, variant:"manga", navigate});
                            }}
                            className="text-app-text"
                            >
                                <ArrowCircleLeft/>
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Ir a la última página">
                            <IconButton  onClick={()=>{
                                setPage(bookData.pages);
                            }}
                            className="text-app-text"
                            >
                                <SkipPrevious/>
                            </IconButton>
                        </Tooltip>
                        <p>{readerSettings.r2l ? getTotalPages() : getCurrentPage()}
                        </p>
                    </div>
                ) : (
                    <div className="justify-between flex items-center">
                        <Tooltip title="Ir al libro anterior">
                            <IconButton onClick={async()=>{
                                await createProgress(bookData, currentPage, timer,
                                    bookData.pageChars ? bookData.pageChars[currentPage - 1] : 0, !readerSettings.singlePageView);
                                void prevBook({book:bookData, variant:"manga", navigate});
                            }}
                            className="text-app-text"
                            >
                                <ArrowCircleLeft/>
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Ir a la primera página">
                            <IconButton onClick={()=>{
                                setPage(1);
                            }}
                            className="text-app-text"
                            >
                                <SkipPrevious/>
                            </IconButton>
                        </Tooltip>
                        <p>{readerSettings.r2l ? getTotalPages() : getCurrentPage()}
                        </p>
                    </div>
                )}
                <ThemeProvider theme={readerSettings.r2l ? theme : {}}>
                    <InversedSlider marks track={readerSettings ? "inverted" : "normal"} className="mx-4" min={1} max={readerSettings.hasCover && !readerSettings.singlePageView ?
                        bookData.pages - 1 : bookData.pages} value={currentPage} onChange={(_, v)=>{
                        setPage(v as number);
                    }}
                    step={1}
                    />
                </ThemeProvider>
                {!readerSettings.r2l ? (
                    <div className="justify-between flex items-center">
                        <p>{!readerSettings.r2l ? getTotalPages() : getCurrentPage()}
                        </p>
                        <Tooltip title="Ir a la última página">
                            <IconButton  onClick={()=>{
                                setPage(bookData.pages);
                            }}
                            className="text-app-text"
                            >
                                <SkipNext/>
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Ir al siguiente libro">
                            <IconButton onClick={async()=>{
                                await createProgress(bookData, currentPage, timer,
                                    bookData.pageChars ? bookData.pageChars[currentPage - 1] : 0, !readerSettings.singlePageView);
                                void nextBook({book:bookData, variant:"manga", navigate});
                            }}
                            className="text-app-text"
                            >
                                <ArrowCircleRight/>
                            </IconButton>
                        </Tooltip>
                    </div>
                ) : (
                    <div className="justify-between flex items-center">
                        <p>{!readerSettings.r2l ? getTotalPages() : getCurrentPage()}
                        </p>
                        <Tooltip title="Ir a la primera página">
                            <IconButton onClick={()=>{
                                setPage(1);
                            }}
                            className="text-app-text"
                            >
                                <SkipNext/>
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Ir al libro anterior">
                            <IconButton onClick={async()=>{
                                await createProgress(bookData, currentPage, timer,
                                    bookData.pageChars ? bookData.pageChars[currentPage - 1] : 0, !readerSettings.singlePageView);
                                void prevBook({book:bookData, variant:"manga", navigate});
                            }}
                            className="text-app-text"
                            >
                                <ArrowCircleRight/>
                            </IconButton>
                        </Tooltip>
                    </div>
                )}
            </div>
        )}
    </Fragment>
    )
}