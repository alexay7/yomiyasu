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
        addEventListener("message", (e)=>{
            const {newPage} = e.data as {newPage:number};
            if (newPage || newPage === 0) {
                setCurrentPage(newPage + 1);
            }
        });
        document.documentElement.style.setProperty("--height", `${window.innerHeight}px`);
        window.addEventListener("resize", () => {
            const doc = document.documentElement;
            doc.style.setProperty("--height", `${window.innerHeight}px`);
        });

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

    function setPage(newPage:number):void {
        iframe.current?.contentWindow?.postMessage({action:"setPage", page:newPage});
    }

    function injectCustomScript():void {
        if (!iframe || !iframe.current || !iframe.current.contentWindow) return;

        const customMokuro = document.createElement("script");
        customMokuro.innerHTML = `
            (function(){
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

                pz.pause();

                document.getElementById('topMenu').style.display="none";
                document.getElementById('showMenuA').style.display="none";
                document.body.style.backgroundColor = "black";

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

                let oldUpdate = window.updatePage;

                window.updatePage = function(new_page_idx){
                    oldUpdate(new_page_idx);
                    window.parent.postMessage({newPage:new_page_idx},"*");
                }
            })()
            `;
        iframe.current.contentWindow.document.head.appendChild(customMokuro);

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