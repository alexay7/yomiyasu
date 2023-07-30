import React, {Fragment, useEffect, useRef, useState} from "react";
import {useParams} from "react-router-dom";
import {useQuery} from "react-query";
import {api} from "../../api/api";
import {Book, BookProgress} from "../../types/book";
import {IconButton, Slider} from "@mui/material";
import {ArrowLeft, ArrowRight, SkipNext, SkipPrevious, ArrowBack, Settings, ViewSidebar} from "@mui/icons-material";
import {ReaderSettings} from "./components/ReaderSettings";
import {defaultSets, useSettings} from "../../contexts/SettingsContext";
import {ReaderConfig} from "../../types/settings";
import {StopWatchMenu} from "./components/StopWatchMenu";
import {createProgress} from "../../helpers/progress";
import {PageText} from "./components/PageText";
import {Dictionary} from "./components/Dictionary";
import {nextBook, prevBook} from "../../helpers/book";

export function Reader():React.ReactElement {
    const {id} = useParams();
    const iframe = useRef<HTMLIFrameElement>(null);
    const {readerSettings} = useSettings();

    const [currentPage, setCurrentPage] = useState(1);
    const [showToolBar, setShowToolbar] = useState(true);
    const [doublePages, setDoublePages] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [pageText, setPageText] = useState<string[][][]>([]);
    const [timer, setTimer] = useState(0);
    const [openTextSidebar, setOpenTextSidebar] = useState(false);
    const [searchWord, setSearchWord] = useState("");

    const {data:bookData} = useQuery("book", async()=> {
        const res = await api.get<Book>(`books/${id}`);
        return res;
    }, {refetchOnWindowFocus:false});

    const {data:bookProgress, isLoading} = useQuery(`progress-${id}`, async()=>{
        const res = await api.get<BookProgress>(`readprogress?book=${id}&status=reading`);
        return res;
    }, {refetchOnWindowFocus:false});

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

            if (bookProgress && bookProgress.currentPage) {
                page = bookProgress.currentPage;
            }

            const initial = defaultSets() as {page_idx:number};

            initial.page_idx = page;
            window.localStorage.setItem(`mokuro_/api/static/${encodeURI(bookData.seriePath)}/${encodeURI(bookData.path)}.html`, JSON.stringify(initial));

            setCurrentPage(page);
        }
    }, [bookProgress, bookData, isLoading]);

    useEffect(()=>{
        if (!bookData) return;

        const interval = setInterval(async()=>{
            await createProgress(bookData, currentPage, timer);
        }, 5 * 1000 * 60 * 60);

        return ()=>clearInterval(interval);
    }, [bookData, currentPage, timer]);

    useEffect(() => {
        const handleBeforeUnload = async():Promise<void> => {
            // Save before leaving the page
            if (!bookData) return;
            await createProgress(bookData, currentPage, timer);
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [bookData, currentPage, timer]);

    useEffect(()=>{
        /**
         * Cuando se tengan los datos del libro del backend, se analiza el localstorage para ver
         * la configuración anterior del volumen
         */
        if (bookData) {
            const rawProgress = window.localStorage.getItem(`mokuro_/api/static/${encodeURI(bookData.seriePath)}/${encodeURI(bookData.path)}.html`) as string;
            if (rawProgress) {
                const progress = JSON.parse(rawProgress) as {"page_idx":number, "singlePageView":boolean};
                setDoublePages(!progress.singlePageView);
                setCurrentPage(progress.page_idx + 1);
            }
        }
    }, [bookData]);

    useEffect(()=>{
        // Define la altura del document según la altura de la pantalla FIX IOS
        document.documentElement.style.setProperty("--height", `${window.innerHeight}px`);

        function getselectedText(text:string):void {
            if (text !== "" && text !== "\n") {
                document.body.style.cursor = "wait";
                setSearchWord(text);
                document.body.style.cursor = "default";
            }
        }

        function handleNewMessage(e:MessageEvent<{action:string, value:unknown}>):void {
            switch (e.data.action) {
                case "newPage": {
                    const {value} = e.data as {value:number};
                    if (value || value === 0) {
                        setCurrentPage(value + 1);
                    }
                    break;
                }
                case "text":{
                    const {value} = e.data as {value:string[][][]};
                    setPageText(value);
                    break;
                }
                case "selection":{
                    const {value} = e.data as {value:string};
                    getselectedText(value);
                    break;
                }
            }
        }

        function handleMouseUp():void {
            const selection = window.getSelection();
            if (selection && selection.toString()) {
                getselectedText(selection.toString());
                selection.removeAllRanges();
            }
        }

        function handleTouchUp(e:TouchEvent):void {
            e.stopImmediatePropagation();
            const selection = window.getSelection();
            if (selection && selection.toString()) {
                // Dar tiempo a quitar el dedo
                setTimeout(()=>{
                    getselectedText(selection.toString());
                    selection.removeAllRanges();
                }, 200);
            }
        }

        function handleResize():void {
            const doc = document.documentElement;
            doc.style.setProperty("--height", `${window.innerHeight}px`);
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
            }
        }

        // Recibe mensajes del iframe
        addEventListener("message", handleNewMessage);

        // Detectar clicks en pc
        addEventListener("mouseup", handleMouseUp);

        // Detectar clicks en móviles
        addEventListener("touchend", handleTouchUp);

        // Sirve para calcular la altura en dispositivos móviles
        addEventListener("resize", handleResize);

        // Permite cambiar de página con keybinds
        addEventListener("keydown", handleKeyDown);

        return ()=>{
            removeEventListener("message", handleNewMessage);
            removeEventListener("mouseup", handleMouseUp);
            removeEventListener("touchend", handleTouchUp);
            removeEventListener("resize", handleResize);
            removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    // Función que manda orden al iframe de cambiar de página
    function setPage(newPage:number):void {
        iframe.current?.contentWindow?.postMessage({action:"setPage", page:newPage});
    }

    function closeSettingsMenu():void {
        setShowSettings(false);
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
                            break;
                        };
                        case " ":{
                            inputLeft();
                            break;
                        };
                        case "ArrowRight":{
                            inputRight();
                            break;
                        };
                    };
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                });

                document.body.addEventListener("click",(e)=>{
                    if(window.getSelection().toString()){
                        window.parent.postMessage({action:"selection",value:window.getSelection().toString()},"*")
                    }
                })

                // Desactiva el menú de mokuro si así lo pone en ajustes
                ${readerSettings.panAndZoom ? "" : "pz.pause();zoomEnabled=false;"}

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

                // Oculta el menú de mokuro
                document.getElementById('topMenu').style.display="none";
                document.getElementById('showMenuA').style.display="none";
                document.body.style.backgroundColor = "black";

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
                });

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

                window.updatePage = function(new_page_idx){
                    oldUpdate(new_page_idx);
                    getText()
                    window.parent.postMessage({action:"newPage",value:new_page_idx},"*");
                }
            })()
            `;

        iframe.current.contentWindow.document.head.appendChild(customMokuro);
        iframe.current.contentWindow.document.head.appendChild(customStyles);

        // Muestra/oculta las barras superior/inferior haciendo doble click al documento
        iframe.current.contentWindow.document.body.addEventListener("dblclick", ()=>{
            setShowToolbar((prev)=>!prev);
        });

        // Establece los ajustes del usuario
        if (!bookData) return;
        const currentSettings = JSON.parse(window.localStorage.getItem(`mokuro_/api/static/${encodeURI(bookData.seriePath)}/${encodeURI(bookData.path)}.html`) as string) as ReaderConfig;

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

    return (
        <div className="text-black relative overflow-hidden h-screen flex flex-col">
            {iframe && iframe.current && iframe.current.contentWindow && (
                <ReaderSettings showMenu={showSettings} closeSettings={closeSettingsMenu}
                    iframeWindow={iframe.current.contentWindow}
                />
            )}
            <PageText lines={pageText} open={openTextSidebar} setOpen={setOpenTextSidebar}/>
            <Dictionary searchWord={searchWord} setSearchWord={setSearchWord}/>
            {bookData && (
                <Fragment>
                    {showToolBar && (
                        <div className="bg-[#272727] w-full h-[5vh] text-white flex items-center justify-between fixed top-0 gap-4 py-2 lg:py-1">
                            <div className="w-1/2 flex items-center gap-2 px-2">
                                <IconButton onClick={()=>window.location.href = window.localStorage.getItem("origin") || "/app"}>
                                    <ArrowBack/>
                                </IconButton>
                                <h1 className="text-lg lg:text-xl text-ellipsis overflow-hidden whitespace-nowrap">{bookData.visibleName}</h1>
                            </div>
                            <div className="flex items-center flex-row px-2 gap-1">
                                <StopWatchMenu timer={timer} setTimer={setTimer}/>
                                {/* <IconButton>
                                    <Translate/>
                                </IconButton> */}
                                <IconButton onClick={()=>setShowSettings(true)}>
                                    <Settings/>
                                </IconButton>
                                <IconButton onClick={toggleSidebar}>
                                    <ViewSidebar/>
                                </IconButton>
                            </div>
                        </div>
                    )}
                    <iframe
                        ref={iframe}
                        src={`/api/static/${bookData?.seriePath}/${bookData?.path}.html`}
                        className="w-full measure"
                        onLoad={injectCustomScript}
                    />
                    {showToolBar && (
                        <div className="bg-[#272727] h-[5vh] w-full text-white flex justify-center items-center fixed bottom-0 py-2 lg:py-0" >
                            <div className="justify-between flex items-center">
                                <IconButton onClick={()=>{
                                    void prevBook(bookData);
                                }}
                                >
                                    <ArrowLeft/>
                                </IconButton>
                                <IconButton onClick={()=>{
                                    setPage(1);
                                }}
                                >
                                    <SkipPrevious/>
                                </IconButton>
                                <p>{currentPage}</p>
                            </div>
                            <Slider className="mx-4" min={1} max={bookData.pages} value={currentPage} onChange={(e, v)=>{
                                setPage(v as number);
                            }}
                            step={doublePages ? 2 : 1}
                            />
                            <div className="justify-between flex items-center">
                                <p>{bookData?.pages}</p>
                                <IconButton  onClick={()=>{
                                    setPage(bookData.pages);
                                }}
                                >
                                    <SkipNext/>
                                </IconButton>
                                <IconButton onClick={()=>{
                                    void nextBook(bookData);
                                }}
                                >
                                    <ArrowRight/>
                                </IconButton>
                            </div>
                        </div>
                    )}
                </Fragment>
            )}
        </div>
    );
}