import { ArrowBack, ArrowBackIosNew, ArrowForwardIos, Settings, SkipNext, SkipPrevious, Timer, ViewSidebar } from "@mui/icons-material";
import { createTheme, IconButton, ThemeProvider, Tooltip } from "@mui/material";
import React, { Fragment, SetStateAction, useEffect, useState } from "react";
import { StopWatchMenu } from "./StopWatchMenu";
import { InversedSlider } from "./InversedSlider";
import { useSettingsStore } from "../../../stores/SettingsStore";
import { useMediaQuery } from "react-responsive";
import { buildMokuroScript, mokuroStyles } from "../../../helpers/mokuroScript";

type RemoteReaderProps = {
    readerVars:{
        currentPage:number;
        iframe:React.RefObject<HTMLIFrameElement>;
        showSettings:boolean;
        setShowSettings:(v:boolean)=>void;
        timer:number;
        setTimer:(v:SetStateAction<number>)=>void;
        timerOn:boolean;
        setTimerOn:(v:SetStateAction<boolean>)=>void;
        setOpenTextSidebar:(v:SetStateAction<boolean>)=>void;
        localHtml:string;
        pages:number;
        iframeOnLoad:()=>void;
        name:string;
        resetBook:()=>void;
    }
}

const theme = createTheme({
    direction: "rtl"
});

export default function LocalReader({readerVars:{currentPage,timer,
    setTimer,setTimerOn,timerOn,iframe,setShowSettings,setOpenTextSidebar,localHtml,pages,iframeOnLoad,name,resetBook
}}:RemoteReaderProps):React.ReactElement{
    const {readerSettings,siteSettings}=useSettingsStore()

    const [showToolBar, setShowToolbar] = useState(true);

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

            iframeOnLoad()
    
            const customStyles = document.createElement("style");
    
            customStyles.innerHTML = mokuroStyles;
    
            const customMokuro = document.createElement("script");
    
            customMokuro.innerHTML = buildMokuroScript(readerSettings, {clickDisplayOcr:true});
    
            const preload = document.createElement("div");
            preload.id = "preload-image";
    
            iframe.current.contentWindow.document.body.appendChild(preload);
            iframe.current.contentWindow.document.head.appendChild(customMokuro);
            iframe.current.contentWindow.document.head.appendChild(customStyles);
    
            // Muestra/oculta las barras superior/inferior haciendo doble click al documento
            iframe.current.contentWindow.document.body.addEventListener("dblclick", ()=>{
                setShowToolbar((prev)=>!prev);
            });

    
                iframe.current.contentWindow.postMessage({action:"setSettings", property:"r2l"});
                iframe.current.contentWindow.postMessage({action:"setSettings", property:"ctrlToPan"});
            iframe.current.contentWindow.postMessage({action:"setSettings", property:"defaultZoom", value:readerSettings.defaultZoomMode});
                iframe.current.contentWindow.postMessage({action:"setSettings", property:"ocr"});
                iframe.current.contentWindow.postMessage({action:"setSettings", property:"doublePage"});
                iframe.current.contentWindow.postMessage({action:"setSettings", property:"coverPage"});
                iframe.current.contentWindow.postMessage({action:"setSettings", property:"borders"});
            iframe.current.contentWindow.postMessage({action:"setSettings", property:"fontSize", value:readerSettings.fontSize});
                iframe.current.contentWindow.postMessage({action:"setSettings", property:"toggleBoxes"});
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
    
        // function getTimeLeft():string {
        //     if (!bookData?.pageChars || !bookData.characters) return "";
    
        //     const readChars = bookData.pageChars[currentPage];
        //     const consumedTime = timer;
        //     let speed = readChars / consumedTime;
        //     if (speed <= 0) {
        //         speed = 1;
        //     }
        //     const charactersLeft = bookData.characters - bookData.pageChars[currentPage];
    
        //     return formatTime(charactersLeft / speed);
        // }
    
        // function calculateCharacters():number {
        //     if (!bookData) return 0;
    
        //     if (currentPage > 1) {
        //         if (!doublePages) {
        //             return (bookData.pageChars || [0])[currentPage - 1] - (bookData.pageChars || [0])[currentPage - 2];
        //         }
    
        //         // Sumar los caracteres de las dos páginas
        //         return (bookData.pageChars || [0])[currentPage] - (bookData.pageChars || [0])[currentPage - 2];
    
        //     }
        //     return (bookData.pageChars || [0])[0];
        // }
    
        // function calculateCurrentCharacters():number {
        //     if (!bookData) return 0;
    
        //     if (currentPage > 1) {
        //         if (!doublePages) {
        //             return (bookData.pageChars || [0])[currentPage - 1];
        //         }
    
        //         // Sumar los caracteres de las dos páginas
        //         return (bookData.pageChars || [0])[currentPage];
    
        //     }
        //     return (bookData.pageChars || [0])[0];
        // }
    
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
                        <IconButton
                        className="text-app-text" onClick={resetBook}
                        >
                            <ArrowBack/>
                        </IconButton>
                    </Tooltip>
                    <h1 className="text-lg lg:text-xl text-ellipsis overflow-hidden whitespace-nowrap max-w-[10ch] lg:max-w-[30ch]">{name}</h1>
                </div>
                <div className="flex items-center flex-row px-2 gap-1 grow lg:w-1/2 justify-end">
                    {/* <Tooltip enterTouchDelay={0} title={`${calculateCharacters()} caracteres`}>
                        <IconButton>
                            <Translate className="text-app-text"/>
                        </IconButton>
                    </Tooltip> */}
                    <StopWatchMenu
                        timer={timer} setTimer={setTimer}
                        timerOn={timerOn} setTimerOn={setTimerOn}
                        currentPage={currentPage}
                    />
                    {/* <IconButton>
                        <Translate/>
                    </IconButton> */}
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
            src={localHtml}
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
                <p className="text-[#ebe8e3] font-semibold text-lg" style={{textShadow:"-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black"}}>{currentPage} / {pages}</p>
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
                {readerSettings.r2l ? (
                    <div className="justify-between flex items-center">
                        <Tooltip title="Ir a la última página">
                            <IconButton  onClick={()=>{
                                setPage(pages);
                            }}
                            className="text-app-text"
                            >
                                <SkipPrevious/>
                            </IconButton>
                        </Tooltip>
                        <p>{readerSettings.r2l ? pages : getCurrentPage()}
                        </p>
                    </div>
                ) : (
                    <div className="justify-between flex items-center">
                        <Tooltip title="Ir a la primera página">
                            <IconButton onClick={()=>{
                                setPage(1);
                            }}
                            className="text-app-text"
                            >
                                <SkipPrevious/>
                            </IconButton>
                        </Tooltip>
                        <p>{readerSettings.r2l ? pages : getCurrentPage()}
                        </p>
                    </div>
                )}
                <ThemeProvider theme={readerSettings.r2l ? theme : {}}>
                    <InversedSlider marks track={readerSettings ? "inverted" : "normal"} className="mx-4" min={1} max={readerSettings.hasCover && !readerSettings.singlePageView ?
                        pages - 1 : pages} value={currentPage} onChange={(_, v)=>{
                        setPage(v as number);
                    }}
                    step={1}
                    />
                </ThemeProvider>
                {!readerSettings.r2l ? (
                    <div className="justify-between flex items-center">
                        <p>{!readerSettings.r2l ? pages : getCurrentPage()}
                        </p>
                        <Tooltip title="Ir a la última página">
                            <IconButton  onClick={()=>{
                                setPage(pages);
                            }}
                            className="text-app-text"
                            >
                                <SkipNext/>
                            </IconButton>
                        </Tooltip>
                    </div>
                ) : (
                    <div className="justify-between flex items-center">
                        <p>{!readerSettings.r2l ? pages : getCurrentPage()}
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
                    </div>
                )}
            </div>
        )}
    </Fragment>
    )
}