import React, {useRef, useState} from "react";
import {SerieWithProgress} from "../../types/serie";
import {Fade, IconButton, Rating, Tooltip} from "@mui/material";
import {Book, Whatshot} from "@mui/icons-material";
import {SerieSettings} from "./components/SerieSettings";
import {useNavigate} from "react-router-dom";
import {goTo} from "../../helpers/helpers";
import {getFlameColor} from "../../helpers/series";
import {twMerge} from "tailwind-merge";

interface SerieComponentProps {
    serieData:SerieWithProgress,
    variant?:"manga" | "novela"
}

export function SerieComponent(props:SerieComponentProps):React.ReactElement {
    const {serieData, variant} = props;
    const lastProgressRef = useRef<HTMLDivElement>(null);
    const [onItem, setOnItem] = useState(false);
    const [unreadBooks, setUnreadBooks] = useState(serieData.unreadBooks);

    const navigate = useNavigate();

    const thumbnail = serieData ? variant === "manga" ? `/api/static/mangas/${serieData.thumbnailPath}` : `/api/static/novelas/${serieData.thumbnailPath}` : "";

    return (
        <div className="w-[9rem] flex-shrink-0">
            <div className="h-[13rem] bg-contain bg-repeat-round relative cursor-pointer duration-150 hover:shadow-[inset_0_0_0_4px_var(--primary-color)] hover:opacity-80 group"
                onClick={(e)=>{
                    if (e.target === e.currentTarget) {
                        goTo(navigate, `/app/series/${serieData._id}`);
                    }
                }}
                onMouseEnter={()=>setOnItem(true)} onMouseLeave={()=>setOnItem(false)}
            >
                <div className="absolute top-0 w-full h-full overflow-hidden">
                    <img className={twMerge("group-hover:scale-110 group-hover:blur-[2px] scale-100 transition-all duration-300")} loading="lazy" src={`${encodeURI(thumbnail)}`} alt={serieData.visibleName} />
                </div>
                <div ref={lastProgressRef} className="absolute bottom-0 bg-primary h-1"/>
                {unreadBooks > 0 && (
                    <div className="absolute top-0 right-0 text-white min-w-[1.5rem] h-6 text-center font-semibold">
                        <p className={`p-1 ${serieData.readlist ? "bg-accent" : "bg-primary"}`}>{unreadBooks}</p>
                    </div>
                )}
                {serieData.difficulty > 0 && (
                    <div className="absolute top-0 left-0 text-center font-semibold bg-white m-1 rounded-full flex justify-center items-center p-1">
                        <Tooltip title={`Dificultad: ${serieData.difficulty.toFixed(1)}/10`}>
                            <Whatshot fontSize="medium" sx={{color:getFlameColor(serieData.difficulty)}}/>
                        </Tooltip>
                    </div>
                )}
                {serieData.valoration && (
                    <div className="absolute bottom-0 right-0 text-center font-semibold bg-white m-1 rounded-full flex justify-center items-center p-1">
                        <Rating size="small" readOnly value={serieData.valoration / 2} max={5} precision={0.5}/>
                    </div>
                )}

                <Fade in={onItem}>
                    <div>
                        <IconButton className="absolute w-16 h-16 text-center left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-primary bg-white rounded-full" onClick={()=>goTo(navigate, `/app/series/${serieData._id}`)}>
                            <Book className="w-12 h-12"/>
                        </IconButton>
                    </div>
                </Fade>
            </div>

            <div className="dark:bg-[#1E1E1E] dark:text-white flex flex-col px-2 pt-3 pb-1 rounded-b shadow-sm shadow-gray-500">
                <a href={`/app/series/${serieData._id}`} className="line-clamp-2 h-12" onClick={()=>{
                    window.localStorage.setItem("origin", window.location.pathname);
                }}
                >{serieData.visibleName}
                </a>
                <div className="flex items-center justify-between">
                    <p className="dark:text-gray-300 text-sm lg:text-xs">{serieData.bookCount} libros</p>
                    <SerieSettings serieData={serieData} unreadBooks={unreadBooks} setUnreadBooks={setUnreadBooks}/>
                </div>
            </div>
        </div>
    );
}