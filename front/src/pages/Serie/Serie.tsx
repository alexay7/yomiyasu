import React, {useEffect, useRef, useState} from "react";
import {useQuery, useQueryClient} from "react-query";
import {useNavigate, useParams} from "react-router-dom";
import {api} from "../../api/api";
import {FullSerie} from "../../types/serie";
import {Accordion, AccordionDetails, AccordionSummary, Button, IconButton, Tooltip} from "@mui/material";
import {BookComponent} from "../../components/BookComponent/BookComponent";
import {BookWithProgress} from "../../types/book";
import {useGlobal} from "../../contexts/GlobalContext";
import {ArrowBack, ArrowDropDown, ArrowDropUp, BookmarkAdd, BookmarkRemove, Download, ExpandMore, Whatshot} from "@mui/icons-material";
import {SerieSettings} from "../../components/SerieComponent/components/SerieSettings";
import {goBack, goTo} from "../../helpers/helpers";
import {EditSerie} from "../../components/EditSerie/EditSerie";
import {useAuth} from "../../contexts/AuthContext";
import {Reviews} from "./components/Reviews";
import {addToReadlist, getFlameColor, removeFromReadlist} from "../../helpers/series";
import {Helmet} from "react-helmet";
import SpeedGraph from "./components/SpeedGraph";
import {openNovel} from "../../helpers/ttu";

function Serie():React.ReactElement {
    const {id} = useParams();
    const {reloaded, ttuConnector} = useGlobal();
    const {userData} = useAuth();
    const [readMore, setReadMore] = useState(false);
    const [textOverflows, setTextOverflows] = useState(false);
    const queryClient = useQueryClient();
    const [unreadBooks, setUnreadBooks] = useState(0);

    const overflowingText = useRef<HTMLParagraphElement | null>(null);

    const {data:serieData, refetch:serieRefetch} = useQuery(`serie-${id}`, async()=>{
        const response = await api.get<FullSerie>(`series/serie/${id}`);

        if (response) {
            setUnreadBooks(response.unreadBooks);
            return response;
        }
    });

    const {data:serieBooks, refetch:booksRefetch} = useQuery(`books-serie-${id}`, async()=>{
        const response = await api.get<BookWithProgress[]>(`books/${serieData!.variant}?serie=${id}&sort=sortName`);
        return response;
    }, {enabled:!!serieData});

    const navigate = useNavigate();

    useEffect(() => {
        if (overflowingText.current) {
        // Check if the text overflows after the component has been rendered
            const isOverflowing = overflowingText.current.scrollHeight > overflowingText.current.clientHeight;
            setTextOverflows(isOverflowing);
        }
    }, []);

    useEffect(()=>{
        async function refetchBooks():Promise<void> {
            if (reloaded === "all") {
                await booksRefetch();
            }
            await serieRefetch();
        }

        if (reloaded) {
            void refetchBooks();
        }
    }, [booksRefetch, serieRefetch, reloaded]);

    function getReadButtonText():string {
        if (!serieData) return "";
        if (unreadBooks === 0) return "Leer de nuevo";

        if (unreadBooks === serieData.bookCount) return "Empezar a leer";

        return "Seguir leyendo";
    }

    function getCharacterCount():string {
        if (!serieBooks || serieBooks.length === 0) return "";
        let characters = 0;

        serieBooks?.forEach((book)=>{
            characters += book.characters || 0;
        });

        return `${characters} caracteres totales (${Math.floor(characters / serieBooks?.length)} caract./libro)`;
    }

    const thumbnailUrl = serieData ? serieData.variant === "manga" ? `/api/static/mangas/${serieData.thumbnailPath}` : `/api/static/novelas/${serieData.thumbnailPath}` : "";

    return (
        <div className="dark:bg-[#121212] pb-4">
            <Helmet>
                <title>{`YomiYasu - ${serieData?.visibleName ? serieData?.visibleName : "serie"}`}</title>
            </Helmet>
            <div className="z-20 w-fill dark:bg-[#212121] bg-[#f7f7f7] flex items-center justify-between h-14 border-x border-0 border-solid border-[#0000001f]">
                <div className="flex items-center mx-4 w-5/6 overflow-hidden">
                    <IconButton onClick={()=>goBack(navigate)}>
                        <ArrowBack/>
                    </IconButton>
                    {serieData && (
                        <div className="flex gap-4 items-center w-full">
                            <SerieSettings serieData={serieData} unreadBooks={unreadBooks} setUnreadBooks={setUnreadBooks}/>
                            <p className="dark:text-white text-2xl max-w-[50%] overflow-hidden text-ellipsis whitespace-nowrap">{serieData.visibleName}</p>
                            <p className="text-white px-3 py-1 bg-[#555555] rounded-md font-semibold">{serieData.bookCount}</p>
                        </div>
                    )}
                </div>
                {serieData && (
                    <div className="flex items-center mx-4 flex-shrink-0 justify-end">
                        <Tooltip title="Descargar serie">
                            <IconButton onClick={()=>{
                                window.open(`/api/series/${serieData._id}/download`);
                            }}
                            >
                                <Download/>
                            </IconButton>
                        </Tooltip>
                        {!serieData?.readlist ? (
                            <Tooltip title="Añadir a &quot;Leer más tarder&quot;">
                                <IconButton onClick={async()=>{
                                    await addToReadlist(serieData._id, serieData.visibleName);
                                    queryClient.setQueryData(`serie-${id}`, {...serieData, readlist:true});
                                }}
                                >
                                    <BookmarkAdd/>
                                </IconButton>
                            </Tooltip>
                        ) : (
                            <Tooltip title="Quitar de &quot;Leer más tarder&quot;">
                                <IconButton onClick={async()=>{
                                    await removeFromReadlist(serieData._id, serieData.visibleName);
                                    queryClient.setQueryData(`serie-${id}`, {...serieData, readlist:false});
                                }}
                                >
                                    <BookmarkRemove/>
                                </IconButton>
                            </Tooltip>
                        )}
                        {userData?.admin && (
                            <EditSerie circleIcon serieData={serieData}/>
                        )}
                    </div>
                )}
            </div>
            {serieData && (
                <div className="px-8 overflow-y-scroll h-[calc(100svh-7.5rem)]">
                    <div className="flex gap-8 flex-col lg:flex-row pt-8">
                        <div className="flex flex-col items-center sm:items-start sm:flex-row w-full gap-8">
                            <div className="relative w-[14rem] pointer-events-none flex-shrink-0">
                                {unreadBooks > 0 && (
                                    <div className="absolute top-0 right-0 text-white min-w-[1.5rem] h-6 text-center font-semibold">
                                        <p className={`p-2 ${serieData.readlist ? "bg-accent" : "bg-primary"}`}>{unreadBooks}</p>
                                    </div>
                                )}
                                <img loading="lazy" className="rounded-sm" src={thumbnailUrl} alt="" />
                                {serieData.difficulty > 0 && (
                                    <div className="absolute top-0 left-0 text-center font-semibold bg-white m-1 rounded-full">
                                        <div className="relative">
                                            <Whatshot fontSize="large"
                                                sx={{color:getFlameColor(serieData.difficulty)}}
                                            />
                                            <p className="absolute left-1/2 -translate-x-1/2 text-lg text-white"
                                                style={{textShadow:"-1px 0 gray, 0 1px gray, 1px 0 gray, 0 -1px gray"}}
                                            >{serieData.difficulty.toFixed(1)}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex sm:w-4/6 flex-col dark:text-white">
                                <p className="text-3xl">{serieData.visibleName}</p>
                                {serieData.status && (
                                    <Button color={serieData.status === "PUBLISHING" ? "primary" : "error"} variant="outlined" className="w-fit py-0 my-4">{serieData.status === "PUBLISHING" ? "En publicación" : "Finalizado"}</Button>
                                )}
                                <p className="text py-4 pt-2 text-sm">{serieData.bookCount} libros</p>
                                <p className="text py-4 pt-2 text-sm">{getCharacterCount()}</p>
                                {serieBooks && serieBooks.length > 0 && (
                                    <Button color="inherit" variant="contained" className="w-fit my-2 py-1 px-2" onClick={async()=>{
                                        if (unreadBooks === 0) {
                                            if (!confirm("Yas has leído este volumen. ¿Quieres iniciar un nuevo progreso de lectura?")) return;
                                        }
                                        let bookId = 0;
                                        serieBooks.forEach((book, i)=>{
                                            if (book.status === "reading") {
                                                bookId = i;
                                                return;
                                            }
                                        });
                                        if (serieData.variant === "manga") {
                                            goTo(navigate, `/reader/${serieBooks[bookId]._id}`);
                                            return;
                                        }

                                        // NOVELA
                                        await openNovel(ttuConnector, serieBooks[bookId], false, false);
                                    }}
                                    >{getReadButtonText()}
                                    </Button>
                                )}
                                {serieData.summary && (
                                    <div className="text-sm mt-4">
                                        <p className="overflow-hidden whitespace-pre-line" ref={overflowingText} style={{maxHeight:readMore ? "100%" : "11.25rem", transition:"max-height 0.3s ease"}}>{serieData.summary.replace(/(<([^>]+)>)/ig, "")}</p>
                                        {textOverflows && (
                                            <Button className="text-gray-500" onClick={()=>setReadMore(!readMore)}>Leer {readMore ? "menos" : "más"} {readMore ? <ArrowDropUp/> : <ArrowDropDown/>}</Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="w-full md:w-3/4 lg:w-1/2 mx-auto">
                            <Reviews serieData={serieData}/>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 pt-8 pb-4">
                        {serieData.genres.length > 0 && (
                            <div className="flex dark:text-white items-center">
                                <p className="w-[14rem] text-sm">GÉNEROS</p>
                                <ul className="list-none flex gap-2 text-xs">
                                    {serieData.genres.map((genre)=>(
                                        <Button onClick={()=>goTo(navigate, `/app/library?genre=${genre}`)}
                                            onMouseDown={(e)=>{
                                                if (e.button === 1) {
                                                    window.open(`/app/library?genre=${genre}`, "_blank")?.focus();
                                                }
                                            }}
                                            className="px-2 py-0 dark:text-white text-black normal-case border border-solid border-gray-700 rounded-md" key={genre}
                                        >{genre}
                                        </Button>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {serieData.authors.length > 0 && (
                            <div className="flex dark:text-white items-center">
                                <p className="w-[14rem] text-sm">AUTORES</p>
                                <ul className="list-none flex gap-2 text-xs">
                                    {serieData.authors.map((author)=>(
                                        <Button onClick={()=>goTo(navigate, `/app/library?author=${author}`)}
                                            onMouseDown={(e)=>{
                                                if (e.button === 1) {
                                                    window.open(`/app/library?author=${author}`, "_blank")?.focus();
                                                }
                                            }}
                                            className="px-2 py-0 dark:text-white text-black normal-case border border-solid border-gray-700 rounded-md" key={author}
                                        >{author}
                                        </Button>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <div className="px-1">
                        {id && serieData.unreadBooks !== serieData.bookCount && serieBooks && (
                            <Accordion TransitionProps={{unmountOnExit: true}}>
                                <AccordionSummary expandIcon={<ExpandMore/>}>
                                    <p>Tu velocidad de lectura</p>
                                </AccordionSummary>
                                <AccordionDetails className="max-w-[1000px]">
                                    <div className="py-4">
                                        <SpeedGraph serieId={id} books={serieBooks}/>
                                    </div>
                                </AccordionDetails>
                            </Accordion>
                        )}
                    </div>
                    <ul className="flex flex-wrap gap-4 py-4 pb-8">
                        {serieBooks && serieBooks.length > 0 && serieBooks.map((book, i)=>(
                            <BookComponent key={book._id} bookData={book} insideSerie forceRead={unreadBooks === 0}
                                blurred={(serieData.bookCount - unreadBooks) < i}
                            />
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export default Serie;