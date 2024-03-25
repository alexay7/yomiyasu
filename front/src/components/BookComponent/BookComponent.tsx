import React, {useEffect, useRef, useState} from "react";
import {BookWithProgress} from "../../types/book";
import {PlayCircle} from "@mui/icons-material";
import "./styles.css";
import {Fade, IconButton} from "@mui/material";
import {BookSettings} from "./components/BookSettings";
import {useNavigate} from "react-router-dom";
import {goTo, formatTime} from "../../helpers/helpers";
import {defaultSets, useSettingsStore} from "../../stores/SettingsStore";
import {twMerge} from "tailwind-merge";
import {useGlobal} from "../../contexts/GlobalContext";


interface BookComponentProps {
    bookData:BookWithProgress,
    insideSerie?:boolean;
    forceRead?:boolean;
    deck?:boolean;
    blurred?:boolean;
}

export function BookComponent(props:BookComponentProps):React.ReactElement {
    const {bookData, insideSerie, forceRead, deck, blurred} = props;
    const {siteSettings} = useSettingsStore();
    const lastProgressRef = useRef<HTMLDivElement>(null);
    const [onItem, setOnItem] = useState(false);
    const [read, setRead] = useState(bookData.status && bookData.status !== "unread");

    const {ttuConnector} = useGlobal();

    useEffect(()=>{
        if (forceRead) {
            setRead(true);
        }
    }, [forceRead]);

    const navigate = useNavigate();

    const thumbnailUrl = bookData.variant === "manga" ? `/api/static/mangas/${bookData.seriePath}/${bookData.imagesFolder}/${bookData.thumbnailPath}` : `/api/static/novelas/${bookData.seriePath}/${bookData.thumbnailPath}` ;

    useEffect(()=>{
        if (lastProgressRef.current && bookData.lastProgress) {
            if (!read) {
                lastProgressRef.current.style.width = "0%";
                return;
            }
            if ((read && bookData.status === "unread") || bookData.status === "completed") {
                lastProgressRef.current.style.width = "100%";
                return;
            }
            let value = 0;
            // Sets the lastProgress bar
            if (bookData.variant === "manga") {
                value = bookData.lastProgress.currentPage * 100 / bookData.pages;
                value = value < 100 ? value : 100;
            } else {
                value = (bookData.lastProgress.characters || 0) * 100 / (bookData.characters || 1);
                value = value < 100 ? value : 100;
            }
            lastProgressRef.current.style.width = `${value}%`;
        }
    }, [bookData, read]);

    async function goToBook(mouse?:boolean):Promise<void> {
        if (bookData.variant === "manga") {
            // MANGA
            if (siteSettings.openHTML) {
                let settings = defaultSets() as {backgroundColor:string};
                const prevSettings = window.localStorage.getItem(`mokuro_/api/static/${encodeURI(bookData.seriePath)}/${encodeURI(bookData.path)}.html`);
                if (prevSettings) {
                    settings = JSON.parse(prevSettings) as {backgroundColor:string};
                }
                settings.backgroundColor = "#121212";

                window.localStorage.setItem(`mokuro_/api/static/mangas/${encodeURI(bookData.seriePath)}/${encodeURI(bookData.path)}.html`, JSON.stringify(settings));

                if (mouse) {
                    window.open(`/api/static/mangas/${bookData.seriePath}/${bookData.path}.html`, "_blank")?.focus();
                    return;
                }
                window.location.href = `/api/static/mangas/${bookData.seriePath}/${bookData.path}.html`;
                return;
            }
            if (read && bookData.status === "completed") {
                if (!confirm("Yas has leído este volumen. ¿Quieres iniciar un nuevo progreso de lectura?")) return;
            }
            if (mouse) {
                window.open(`/reader/${bookData._id}`, "_blank")?.focus();
                return;
            }
            goTo(navigate, `/reader/${bookData._id}`);
            return;
        }

        // NOVELA
        if (!ttuConnector.current) return;

        const iframe = ttuConnector.current;

        // Download epub file from /api/static/ranobe/haruhi.epub and send it to the iframe via message

        const response = await fetch(`/api/static/novelas/${bookData.seriePath}/${bookData.path}.epub`);

        if (!response.ok) {
            console.error("Failed to fetch epub file");
            return;
        }

        // Send as a File
        const blob = await response.blob();

        const file = new File([blob], `${bookData.path}.epub`, {type: blob.type});

        // Send via postmessage
        iframe.contentWindow?.postMessage({book:file, yomiyasuId:bookData._id, mouse}, "*");
    }

    function renderBookInfo():string {
        if (bookData.variant === "novela") return `${bookData.characters} caracteres`;
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
            case "remainingchars":{
                if (!bookData.pageChars || !bookData.lastProgress || !bookData.characters) return `${bookData.characters} caracteres`;
                return `${bookData.characters - bookData.pageChars[bookData.lastProgress.currentPage]} caract. restantes`;
            }
            case "remainingpages":{
                if (!bookData.lastProgress || !bookData.characters) return `${bookData.pages} páginas`;
                return `${bookData.pages - bookData.lastProgress.currentPage} pags. restantes`;
            }
            case "remainingtime":{
                if (!bookData.pageChars || !bookData.lastProgress || !bookData.characters) return `${bookData.characters} caracteres`;
                const speed = bookData.pageChars[bookData.lastProgress.currentPage] / bookData.lastProgress.time;
                const charsLeft = bookData.characters - bookData.pageChars[bookData.lastProgress.currentPage];
                return `${formatTime(charsLeft / (speed === 0 ? 1 : speed))}`;
            }
            default:{
                return `${bookData.pages} páginas`;
            }
        }
    }

    return (
        <div className="w-[9rem] flex-shrink-0">
            <div className="h-[13rem] rounded-t-sm bg-contain bg-repeat-round relative cursor-pointer duration-150 hover:shadow-[inset_0_0_0_4px_var(--primary-color)] hover:opacity-80 group"
                onMouseDown={(e)=>{
                    if (e.button !== 1 || e.target === e.currentTarget) return;
                    void goToBook(true);
                }}
                onClick={()=>{
                    void goToBook();
                }}
                onMouseEnter={()=>setOnItem(true)} onMouseLeave={()=>setOnItem(false)}
            >
                <div className="absolute top-0 w-full h-full overflow-hidden">
                    <img className={twMerge(blurred && siteSettings.antispoilers ? "blur" : "", "group-hover:scale-110 group-hover:blur-[2px] scale-100 transition-all duration-300")} loading="lazy" src={`${encodeURI(thumbnailUrl)}`} alt={bookData.visibleName} />
                </div>
                <div ref={lastProgressRef} className="absolute bottom-0 bg-primary h-1"/>
                {!read && (
                    <div className={`absolute top-0 right-0 w-0 h-0 border-solid border-y-transparent border-l-transparent ${bookData.readlist ? "border-r-accent" : "border-r-primary"}`} style={{borderWidth:"0 35px 35px 0"}}/>
                )}

                <Fade in={onItem}>
                    <div>
                        <IconButton className="absolute w-16 h-16 text-center left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-primary bg-white rounded-full" onMouseDown={(e)=>{
                            if (e.button !== 1 || e.target === e.currentTarget) return;
                            void goToBook(true);
                        }}
                        onClick={()=>{
                            void goToBook();
                        }}
                        >
                            <PlayCircle className="w-16 h-16"/>
                        </IconButton>
                    </div>
                </Fade>
            </div>

            <div className="dark:bg-[#1E1E1E] dark:text-white flex flex-col px-2 pt-3 pb-1 rounded-b shadow-sm shadow-gray-500">
                {bookData.variant === "manga" && (
                    <a href={siteSettings.openHTML ? `/api/static/mangas/${bookData.seriePath}/${bookData.path}.html` : `/reader/${bookData._id}`}
                        className="line-clamp-2 h-12" onClick={()=>{
                            window.localStorage.setItem("origin", window.location.pathname);
                        }}
                    >{bookData.visibleName}
                    </a>
                )}
                {bookData.variant === "novela" && (
                    <button className="text-left bg-transparent border-0 text-white p-0 hover:underline hover:cursor-pointer text-base">
                        <p className="line-clamp-2 h-12" onMouseDown={(e)=>{
                            if (e.button !== 1 || e.target === e.currentTarget) return;
                            void goToBook(true);
                        }}
                        onClick={()=>{
                            void goToBook();
                        }}
                        >{bookData.visibleName}
                        </p>
                    </button>
                )}
                <div className="flex items-center justify-between text-sm">
                    <p className="dark:text-gray-300 text-sm lg:text-xs">{renderBookInfo()}</p>
                    <BookSettings bookData={bookData} insideSerie={insideSerie} read={read} setRead={setRead} deck={deck}/>
                </div>
            </div>
        </div>
    );
}