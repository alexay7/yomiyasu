/* eslint-disable @typescript-eslint/no-unused-vars */
import React, {Fragment, useEffect, useRef, useState} from "react";
import {useParams} from "react-router-dom";
import {useQuery} from "react-query";
import {api} from "../../api/api";
import {Book} from "../../types/book";
import {Icon, IconButton, Slider} from "@mui/material";
import {ArrowLeft, ArrowRight, SkipNext, SkipPrevious, ArrowBack} from "@mui/icons-material";

export function Reader():React.ReactElement {
    const {id} = useParams();
    const iframe = useRef<HTMLIFrameElement>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [showToolBar, setShowToolbar] = useState(true);
    const [doublePages, setDoublePages] = useState(false);

    const {data:bookData} = useQuery("book", async()=> {
        const res = await api.get<Book>(`books/${id}`);
        return res;
    }, {refetchOnWindowFocus:false});

    useEffect(()=>{
        /**
         * Cuando se tengan los datos del libro del backend, se analiza el localstorage para ver
         * la configuración anterior del volumen
         */
        if (bookData) {
            const rawProgress = window.localStorage.getItem(`mokuro_/api/static/${encodeURI(bookData.serie)}/${encodeURI(bookData.path)}.html`) as string;
            if (rawProgress) {
                const progress = JSON.parse(rawProgress) as {"page_idx":number, "singlePageView":boolean};
                setDoublePages(!progress.singlePageView);
                setCurrentPage(progress.page_idx + 1);
            }
        }
    }, [bookData]);

    useEffect(()=>{
        // Recibe mensajes del iframe para modificar la página anterior
        addEventListener("message", (e)=>{
            const {newPage} = e.data as {newPage:number};
            if (newPage || newPage === 0) {
                setCurrentPage(newPage + 1);
            }
        });

        // Define la altura del document según la altura de la pantalla FIX IOS
        document.documentElement.style.setProperty("--height", `${window.innerHeight}px`);
        window.addEventListener("resize", () => {
            const doc = document.documentElement;
            doc.style.setProperty("--height", `${window.innerHeight}px`);
        });

        // Permite cambiar de página con keybinds
        document.body.addEventListener("keydown", (e)=>{
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
        });
    }, []);

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

        const customMokuro = document.createElement("script");
        customMokuro.innerHTML = `
            (function(){
                /**
                 * Recibe los mensajes del parent para realizar las acciones indicadas
                 */ 
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

                // Desactiva el menú de mokuro
                pz.pause();

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

                window.updatePage = function(new_page_idx){
                    oldUpdate(new_page_idx);
                    window.parent.postMessage({newPage:new_page_idx},"*");
                }
            })()
            `;
        iframe.current.contentWindow.document.head.appendChild(customMokuro);

        // Muestra/oculta las barras superior/inferior haciendo doble click al documento
        iframe.current.contentWindow.document.body.addEventListener("dblclick", (e)=>{
            setShowToolbar((prev)=>!prev);
        });
    }

    return (
        <div className="text-black relative overflow-hidden h-100vh flex flex-col">
            {bookData && (
                <Fragment>
                    {showToolBar && (
                        <div className="bg-[#272727] w-full h-[5vh] text-white flex items-center px-4 fixed top-0 gap-4">
                            <IconButton onClick={()=>window.location.href = "/app"}>
                                <ArrowBack/>
                            </IconButton>
                            <h1 className="text-xl">{bookData.visibleName}</h1>
                        </div>
                    )}
                    <iframe
                        ref={iframe}
                        src={`/api/static/${bookData?.serie}/${bookData?.path}.html`}
                        className="w-full measure"
                        onLoad={injectCustomScript}
                    />
                    {showToolBar && (
                        <div className="bg-[#272727] h-[5vh] w-full text-white flex justify-center items-center fixed bottom-0" >
                            <div className="w-1/4 lg:w-[10%] flex items-center">
                                <IconButton onClick={()=>alert("[EN PROGRESO] Esto te llevaría al vol anterior")}>
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
                            <div className="w-1/4 lg:w-[10%] flex items-center">
                                <p>{bookData?.pages}</p>
                                <IconButton  onClick={()=>{
                                    setPage(bookData.pages);
                                }}
                                >
                                    <SkipNext/>
                                </IconButton>
                                <IconButton onClick={()=>alert("[EN PROGRESO] Esto te llevaría al vol siguiente")}>
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