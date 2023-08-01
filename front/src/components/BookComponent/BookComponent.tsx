import React, {useEffect, useRef, useState} from "react";
import {BookWithProgress} from "../../types/book";
import {PlayCircle} from "@mui/icons-material";
import "./styles.css";
import {Fade, IconButton} from "@mui/material";
import {BookSettings} from "./components/BookSettings";
import {useNavigate} from "react-router-dom";
import {goTo} from "../../helpers/helpers";
import {useSettings} from "../../contexts/SettingsContext";

interface BookComponentProps {
    bookData:BookWithProgress,
    insideSerie?:boolean;
}

export function BookComponent(props:BookComponentProps):React.ReactElement {
    const {bookData, insideSerie} = props;
    const {siteSettings} = useSettings();
    const lastProgressRef = useRef<HTMLDivElement>(null);
    const [onItem, setOnItem] = useState(false);

    const navigate = useNavigate();
    const thumbnailUrl = `/api/static/${bookData.seriePath}/${bookData.imagesFolder}/${bookData.thumbnailPath}`;

    useEffect(()=>{
        if (lastProgressRef.current && bookData.lastProgress) {
            // Sets the lastProgress bar
            let value = bookData.lastProgress.currentPage * 100 / bookData.pages;
            value = value < 100 ? value : 100;
            value = value > 2 ? value : 2;
            lastProgressRef.current.style.width = `${value}%`;
        }
    }, [bookData]);

    function goToBook():void {
        if (siteSettings.openHTML) {
            window.location.href = `/api/static/${bookData.seriePath}/${bookData.path}.html`;
            return;
        }
        if (bookData.status === "completed") {
            if (!confirm("Yas has leído este volumen. ¿Quieres iniciar un nuevo progreso de lectura?")) return;
        }
        goTo(navigate, `/reader/${bookData._id}`);
    }

    function renderBookInfo():string {
        switch (siteSettings.bookView) {
            case "characters":{
                return `${bookData.characters} caracteres`;
            }
            case "pages":{
                return `${bookData.pages} páginas`;
            }
            case "both":{
                return `${bookData.pages} pags y ${bookData.characters} chars`;
            }
            default:{
                return `${bookData.pages} páginas`;
            }
        }
    }

    return (
        <div className="w-[9rem] flex-shrink-0">
            <div className="h-[13rem] rounded-t-sm bg-contain bg-repeat-round relative cursor-pointer duration-150 hover:shadow-[inset_0_0_0_4px_var(--primary-color)] hover:opacity-80"
                style={{backgroundImage:`url(${encodeURI(thumbnailUrl)})`}}
                onClick={(e)=>{
                    if (e.target === e.currentTarget) {
                        goToBook();
                    }
                }}
                onMouseEnter={()=>setOnItem(true)} onMouseLeave={()=>setOnItem(false)}
            >
                <div ref={lastProgressRef} className="absolute bottom-0 bg-primary h-1"/>
                {bookData.status === "unread" && (
                    <div className={`absolute top-0 right-0 w-0 h-0 border-solid border-y-transparent border-l-transparent ${bookData.readlist ? "border-r-blue-500" : "border-r-primary"}`} style={{borderWidth:"0 35px 35px 0"}}/>
                )}

                <Fade in={onItem}>
                    <div>
                        <IconButton className="absolute w-16 h-16 text-center left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-primary bg-white rounded-full" onClick={()=>goToBook()}>
                            <PlayCircle className="w-16 h-16"/>
                        </IconButton>
                    </div>
                </Fade>
            </div>

            <div className="bg-[#1E1E1E] text-white flex flex-col px-2 pt-3 pb-1 rounded-b">
                <a href={siteSettings.openHTML ? `/api/static/${bookData.seriePath}/${bookData.path}.html` : `/reader/${bookData._id}`}
                    className="line-clamp-2 h-12" onClick={()=>{
                        window.localStorage.setItem("origin", window.location.pathname);
                    }}
                >{bookData.visibleName}
                </a>
                <div className="flex items-center justify-between text-sm">
                    {renderBookInfo()}
                    <BookSettings bookData={bookData} insideSerie={insideSerie}/>
                </div>
            </div>
        </div>
    );
}