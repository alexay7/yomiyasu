import { ArrowBack, ArrowBackIosNew, ArrowCircleLeft, ArrowCircleRight, ArrowForwardIos, Settings, SkipNext, SkipPrevious, Timer, Translate, ViewSidebar } from "@mui/icons-material";
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
import { formatTime } from "../../../helpers/helpers";

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
    }
}

const theme = createTheme({
    direction: "rtl"
});

export default function RemoteReader({readerVars:{bookData, currentPage,timer,bookProgress,
    setTimer,setTimerOn,timerOn,iframe,setShowSettings,doublePages,setOpenTextSidebar
}}:RemoteReaderProps):React.ReactElement{
    const {readerSettings,siteSettings}=useSettingsStore()


    const [showTimeLeft, setShowTimeLeft] = useState(false);
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
    
            const customStyles = document.createElement("style");
    
            customStyles.innerHTML = `
            @font-face {
                font-family: "Zen Antique";
                src: url("/fonts/ZenAntique.ttf") format("truetype");;
            }
            @font-face {
                font-family: "IPA";
                src: url("/fonts/ipaexg.ttf") format("truetype");;
            }
    
            .pageContainer * { font-family: var(--user-font); }
            `;
    
            const customMokuro = document.createElement("script");
    
            customMokuro.innerHTML = `
                (function(){
                    /**
                     * Recibe los mensajes del parent para realizar las acciones indicadas
                     */ 
                    let zoomEnabled = true;
    
                        window.addEventListener("message",
                        (event) => {
                            if (event.origin !== window.location.origin) return;
                            
                            switch(event.data.action){
                                case "goRight":{
                                    inputRight();
                                    break;
                                };
                                case "goLeft":{
                                    inputLeft();
                                    break;
                                };
                                case "setPage":{
                                    updatePage(event.data.page-1);
                                    break;
                                };
                                case "getSettings":{
                                    window.parent.postMessage({"action":"settings",value:state},"*");
                                    break;
                                };
                                case "setSettings":{
                                    switch(event.data.property){
                                        case "r2l":{
                                            document.getElementById("menuR2l").click();
                                            break;
                                        };
                                        case "ctrlToPan":{
                                            document.getElementById("menuCtrlToPan").click();
                                            break;
                                        };
                                        case "doublePage":{
                                            document.getElementById("menuDoublePageView").click();
                                            break;
                                        };
                                        case "coverPage":{
                                            document.getElementById("menuHasCover").click();
                                            break;
                                        };
                                        case "borders":{
                                            document.getElementById("menuTextBoxBorders").click();
                                            break;
                                        };
                                        case "ocr":{
                                            document.getElementById("menuDisplayOCR").click();
                                            break;
                                        };
                                        case "fontSize":{
                                            document.getElementById("menuFontSize").value=event.data.value;
                                            const newEvent = new Event("change");
                                            document.getElementById("menuFontSize").dispatchEvent(newEvent);
                                            break;
                                        };
                                        case "defaultZoom":{
                                            document.getElementById("menuDefaultZoom").value=event.data.value;
                                            const newEvent = new Event("change");
                                            document.getElementById("menuDefaultZoom").dispatchEvent(newEvent);
                                            break;
                                        };
                                        case "toggleBoxes":{
                                            document.getElementById("menuToggleOCRTextBoxes").click();
                                            break;
                                        };
                                        case "enableZoom":{
                                            pz.resume();
                                            zoomEnabled=true;
                                            break;
                                        };
                                        case "disableZoom":{
                                            pz.pause();
                                            zoomEnabled=false;
                                            break;
                                        };
                                    }
                                }
                            };
                        });
    
                    // Permite cambiar de página con keybinds también dentro del iframe
                    document.body.addEventListener("keydown",(e)=>{
                        switch(e.key){
                            case "ArrowLeft":{
                                inputLeft();
                                e.stopPropagation();
                                e.stopImmediatePropagation();
                                break;
                            };
                            case " ":{
                                inputLeft();
                                e.stopPropagation();
                                e.stopImmediatePropagation();
                                break;
                            };
                            case "ArrowRight":{
                                inputRight();
                                e.stopPropagation();
                                e.stopImmediatePropagation();
                                break;
                            };
                            default:{
                                window.parent.postMessage({action:"keypress",value:{key:e.key}},"*");
                            }
                        };
                    });
    
                    ${readerSettings.dictionaryVersion === "word" ?
            `
                    function sendClickedWord(e){
                        if (!event.target) return;
                        const target = event.target;
                        const text = target.textContent;
                        if (!text || target.tagName !== "P") return;
                        let clickedPosition = window.getSelection()?.focusOffset; // Obtiene la posición del clic
                        const extracted = text.slice(clickedPosition);
                        window.parent.postMessage({action:"selection",value:extracted},"*")
                    }
    
                    document.body.addEventListener("click",sendClickedWord)
                    ` : `
                    document.body.addEventListener("click",(e)=>{
                        if(window.getSelection().toString()){
                            window.parent.postMessage({action:"selection",value:window.getSelection().toString()},"*")
                        }
                    })
    
                    function addClickHandlersToParagraphs() {
                        const paragraphs = document.querySelectorAll('p');
                        // Add event listener to each <p> element
                        paragraphs.forEach(paragraph => {
                            paragraph.addEventListener('touchstart', () => {
                                // Retrieve the text content of the clicked <p> element
                                const textContent = paragraph.textContent;
            
                                // Display the text (you can customize this part)
                                window.parent.postMessage({ action: "selection", value: textContent });
                            });
                        });
                    }
            
                    addClickHandlersToParagraphs();                
                    `}
    
                    // Desactiva el menú de mokuro si así lo pone en ajustes
                    ${readerSettings.panAndZoom ? "" : "pz.pause();zoomEnabled=false;"}
    
                    // Oculta el menú de mokuro
                    document.getElementById('topMenu').style.display="none";
                    document.getElementById('showMenuA').style.display="none";
                    // Get color from localStorage
                    const color = window.localStorage.getItem("color-theme");
                    if (color === "dark") {
                        document.body.style.backgroundColor = "black";
                    } else {
                        document.body.style.backgroundColor = "white";
                    }
    
                    ${readerSettings.scrollChange ? `
                    // Permite pasar de página con swipes
                    var touchStart = null;
                    var touchEnd = null;
    
                    document.body.addEventListener("touchstart",(e)=>{
                        touchEnd = null;
                        touchStart = e.targetTouches[0].clientX;
                    });
    
                    document.body.addEventListener("touchmove",(e)=>{
                        if(zoomEnabled && e.targetTouches.length<2)return;
                        touchEnd = e.targetTouches[0].clientX;
                    });
    
                    document.body.addEventListener("touchend",(e)=>{
                        if (!touchStart || !touchEnd) return;
                        const distance = touchStart - touchEnd;
                        const isLeftSwipe = distance > 100;
                        const isRightSwipe = distance < -100;
                        if (isLeftSwipe){
                            inputRight();
                        }else if(isRightSwipe){
                            inputLeft();
                        }
                    });` : ""}
    
                    /**
                     * Reemplaza la función de pasar de página por una que, además de
                     * hacer las mismas funciones que la anterior, mande un mensaje al parent
                     * avisando del cambio de página
                     */
                    let oldUpdate = window.updatePage;
    
                    function getText(){
                        const pageBoxes = document.querySelectorAll('.page');
                        const inlineBlockTextBoxContents = [];
    
                        pageBoxes.forEach((textBox) => {
                            const boxContent = [];
                            if (textBox.style.display === "inline-block") {
                                const divs = textBox.querySelectorAll('.textBox');
                                const divBoxes = []
                                divs.forEach((div) => {
                                    const paragraphs = div.querySelectorAll('p');
                                    const paragraphContent = [];
                                    paragraphs.forEach((paragraph) => {
                                        paragraphContent.push(paragraph.textContent);
                                    })
                                    divBoxes.push(paragraphContent);
                                })
                                boxContent.push(divBoxes);
                            }
                            if (boxContent.length > 0) {
                                inlineBlockTextBoxContents.push(boxContent);
                            }
                        })
    
                        window.parent.postMessage({action:"text",value:inlineBlockTextBoxContents},"*");
                    }
    
                    function getBackgroundImage(page) {
                        const pageContainer = page?.querySelector('.pageContainer');
                        return pageContainer?.style?.backgroundImage
                          ?.slice(4, -1)
                          .replace(/['"]/g, '');
                      }
    
                    const preload = document.getElementById('preload-image');
    
                    function preloadImage() {
                        let preloadContent = '';
                  
                        for (let i = 0; i < 5; i++) {
                          const page = getPage(state.page_idx + i);
                          const backgroundImageUrl = getBackgroundImage(page);
                  
                          if (backgroundImageUrl) {
                            preloadContent += "url("+backgroundImageUrl+") ";
                          }
                        }
                        preload.style.content = preloadContent;
                      }
    
                    window.updatePage = function(new_page_idx){
                        oldUpdate(new_page_idx);
                        preloadImage();
                        getText();
                        window.parent.postMessage({action:"newPage",value:new_page_idx},"*");
                    }
                })()
                `;
    
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
            <div className="dark:bg-[#101010] bg-[#ebe8e3] w-full h-[5vh] dark:text-[#ebe8e3] text-[#0000008a] flex items-center justify-between fixed top-0 gap-4 py-2 lg:py-1 z-20">
                <div className="flex items-center gap-2 px-2 shrink lg:w-1/2">
                    <Tooltip title="Volver atrás">
                        <IconButton onClick={async()=>{
                            await createProgress(bookData, currentPage, timer,
                                bookData.pageChars ? bookData.pageChars[currentPage - 1] : 0, !readerSettings.singlePageView);
                            window.location.href = window.localStorage.getItem("origin") || "/app";
                        }}
                        className="dark:text-[#ebe8e3] text-[#0000008a]"
                        >
                            <ArrowBack/>
                        </IconButton>
                    </Tooltip>
                    <h1 className="text-lg lg:text-xl text-ellipsis overflow-hidden whitespace-nowrap max-w-[10ch] lg:max-w-[30ch]">{bookData.visibleName}</h1>
                </div>
                <div className="flex items-center flex-row px-2 gap-1 grow lg:w-1/2 justify-end">
                    <Tooltip enterTouchDelay={0} title={`${calculateCharacters()} caracteres`}>
                        <IconButton>
                            <Translate className="dark:text-[#ebe8e3] text-[#0000008a]"/>
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
                    <Tooltip title="Ajustes del lector">
                        <IconButton onClick={()=>setShowSettings(true)}>
                            <Settings className="dark:text-[#ebe8e3] text-[#0000008a]"/>
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Mostrar caracteres por separado">
                        <IconButton onClick={toggleSidebar}>
                            <ViewSidebar className="dark:text-[#ebe8e3] text-[#0000008a]"/>
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
            <div className="dark:bg-[#101010] bg-[#ebe8e3] h-[5vh] w-full dark:text-[#ebe8e3] flex justify-center items-center fixed bottom-0 py-2 lg:py-0" >
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
                                void nextBook({book:bookData, variant:"manga"});
                            }}
                            className="dark:text-[#ebe8e3] text-[#0000008a]"
                            >
                                <ArrowCircleLeft/>
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Ir a la última página">
                            <IconButton  onClick={()=>{
                                setPage(bookData.pages);
                            }}
                            className="dark:text-[#ebe8e3] text-[#0000008a]"
                            >
                                <SkipPrevious/>
                            </IconButton>
                        </Tooltip>
                        <p>{readerSettings.r2l ? getTotalPages() : getCurrentPage()}
                        </p>
                    </div>
                ) : (
                    <div className="justify-between flex items-center">
                        <Tooltip title="It al libro anterior">
                            <IconButton onClick={async()=>{
                                await createProgress(bookData, currentPage, timer,
                                    bookData.pageChars ? bookData.pageChars[currentPage - 1] : 0, !readerSettings.singlePageView);
                                void prevBook({book:bookData, variant:"manga"});
                            }}
                            className="dark:text-[#ebe8e3] text-[#0000008a]"
                            >
                                <ArrowCircleLeft/>
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Ir a la primera página">
                            <IconButton onClick={()=>{
                                setPage(1);
                            }}
                            className="dark:text-[#ebe8e3] text-[#0000008a]"
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
                            className="dark:text-[#ebe8e3] text-[#0000008a]"
                            >
                                <SkipNext/>
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Ir al siguiente libro">
                            <IconButton onClick={async()=>{
                                await createProgress(bookData, currentPage, timer,
                                    bookData.pageChars ? bookData.pageChars[currentPage - 1] : 0, !readerSettings.singlePageView);
                                void nextBook({book:bookData, variant:"manga"});
                            }}
                            className="dark:text-[#ebe8e3] text-[#0000008a]"
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
                            className="dark:text-[#ebe8e3] text-[#0000008a]"
                            >
                                <SkipNext/>
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="It al libro anterior">
                            <IconButton onClick={async()=>{
                                await createProgress(bookData, currentPage, timer,
                                    bookData.pageChars ? bookData.pageChars[currentPage - 1] : 0, !readerSettings.singlePageView);
                                void prevBook({book:bookData, variant:"manga"});
                            }}
                            className="dark:text-[#ebe8e3] text-[#0000008a]"
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