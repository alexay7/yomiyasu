import {useQuery, useQueryClient} from "@tanstack/react-query";
import {ArrowLeft, Bookmark, BookmarkCheck, ChevronDown, ChevronUp, Download, Play} from "lucide-react";
import React, {useEffect, useMemo, useRef, useState} from "react";
import {Link, useNavigate, useParams} from "react-router";
import {api} from "../../api/api";
import {CardMenu} from "../../components/CoverCard/CardMenu";
import {CoverCard} from "../../components/CoverCard/CoverCard";
import {useAuth} from "../../contexts/AuthContext";
import {addToReadlist, removeFromReadlist} from "../../helpers/series";
import {invalidateReadlist} from "../../lib/invalidate";
import {serieThumbnail} from "../../lib/media";
import {CoverImage} from "../../components/CoverImage";
import {keys} from "../../lib/queryKeys";
import {useOpenBook} from "../../lib/useOpenBook";
import {useTitle} from "../../lib/useTitle";
import {confirmDialog} from "../../stores/ConfirmStore";
import type {BookWithProgress} from "../../types/book";
import type {FullSerie} from "../../types/serie";
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "../../ui/Accordion";
import {Badge} from "../../ui/Badge";
import {Button} from "../../ui/Button";
import {EmptyState} from "../../ui/EmptyState";
import {ErrorState} from "../../ui/ErrorState";
import {IconButton} from "../../ui/IconButton";
import {Spinner} from "../../ui/Spinner";
import {Tooltip} from "../../ui/Tooltip";
import {Reviews} from "./components/Reviews";
import {RerollFab} from "./components/RerollFab";
import SpeedGraph from "./components/SpeedGraph";

function Serie():React.ReactElement {
    const {id} = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const {userData} = useAuth();
    const openBook = useOpenBook();

    const [readMore, setReadMore] = useState(false);
    const [textOverflows, setTextOverflows] = useState(false);
    const [unreadBooks, setUnreadBooks] = useState(0);

    const overflowingText = useRef<HTMLParagraphElement | null>(null);

    const {data:serieData, isLoading, isError, refetch, isFetching} = useQuery({
        queryKey:keys.serie(id),
        queryFn:async()=>{
            return await api.get<FullSerie>(`series/serie/${id}`);
        },
        enabled:!!id
    });

    useEffect(()=>{
        if (serieData) {
            setUnreadBooks(serieData.unreadBooks);
        }
    }, [serieData]);

    const {data:serieBooks} = useQuery({
        queryKey:keys.serieBooks(id),
        queryFn:async()=>{
            const response = await api.get<BookWithProgress[]>(`books/${serieData!.variant}?serie=${id}&sort=sortName`);
            return response ?? [];
        },
        enabled:!!serieData
    });

    useTitle(serieData?.visibleName ?? (isLoading ? "Serie" : undefined));

    useEffect(() => {
        if (overflowingText.current) {
            setTextOverflows(overflowingText.current.scrollHeight > overflowingText.current.clientHeight);
        }
    }, [serieData]);

    // Volumen por el que continuar la lectura
    const currentBook = useMemo(()=>{
        if (!serieBooks || serieBooks.length === 0) return undefined;

        return serieBooks.find((book)=>book.status === "reading")
            ?? serieBooks.find((book)=>book.status !== "completed")
            ?? serieBooks[0];
    }, [serieBooks]);

    async function continueReading():Promise<void> {
        if (!currentBook) return;

        if (unreadBooks === 0) {
            if (!await confirmDialog("Ya has leído este volumen. ¿Quieres iniciar un nuevo progreso de lectura?")) return;
        }

        await openBook(currentBook, {confirmReread:false});
    }

    async function toggleReadlist():Promise<void> {
        if (!serieData) return;

        const next = !serieData.readlist;

        // Actualización optimista
        queryClient.setQueryData(keys.serie(id), {...serieData, readlist:next});

        if (next) {
            await addToReadlist(serieData._id, serieData.visibleName);
        } else {
            await removeFromReadlist(serieData._id, serieData.visibleName);
        }

        invalidateReadlist();
    }

    function getCharacterCount():string {
        if (!serieBooks || serieBooks.length === 0) return "";
        let characters = 0;

        serieBooks.forEach((book)=>{
            characters += book.characters || 0;
        });

        return `${characters.toLocaleString()} caracteres totales (${Math.floor(characters / serieBooks.length).toLocaleString()} por libro)`;
    }

    const ctaLabel = unreadBooks === 0 ? "Leer de nuevo" : unreadBooks === serieData?.bookCount ? "Empezar a leer" : "Seguir leyendo";

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center py-24">
                <Spinner size={28} className="text-fg-muted" />
            </div>
        );
    }

    if (isError || !serieData) {
        return (
            <ErrorState
                title="No se pudo cargar la serie"
                onRetry={()=>void refetch()}
                className="py-24"
            />
        );
    }

    return (
        <div className="flex min-h-full flex-col">
            <div className="sticky top-0 z-20 border-b border-app-border bg-app-sidebar">
                <div className="flex h-14 items-center gap-1.5 px-3">
                    <IconButton label="Volver atrás" onClick={()=>navigate(-1)}>
                        <ArrowLeft />
                    </IconButton>
                    <CardMenu kind="serie" serie={serieData} unreadBooks={unreadBooks} onUnreadChanged={setUnreadBooks} />
                    <h1 className="min-w-0 flex-1 truncate px-1 text-base font-semibold text-fg">{serieData.visibleName}</h1>
                    {isFetching ? <Spinner size={14} className="text-fg-muted" /> : null}
                    <Badge variant="neutral">{serieData.bookCount} libros</Badge>

                    <div className="ml-2 flex items-center gap-1">
                        <Tooltip content="Descargar serie">
                            <IconButton label="Descargar serie" onClick={()=>window.open(`/api/series/${serieData._id}/download`)}>
                                <Download />
                            </IconButton>
                        </Tooltip>
                        <Tooltip content={serieData.readlist ? "Quitar de “Leer más tarde”" : "Añadir a “Leer más tarde”"}>
                            <IconButton
                                label={serieData.readlist ? "Quitar de Leer más tarde" : "Añadir a Leer más tarde"}
                                variant={serieData.readlist ? "primary" : "ghost"}
                                onClick={()=>void toggleReadlist()}
                            >
                                {serieData.readlist ? <BookmarkCheck /> : <Bookmark />}
                            </IconButton>
                        </Tooltip>
                    </div>
                </div>
            </div>

            <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 lg:px-8 lg:py-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
                    {/* Portada + metadatos */}
                    <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
                        <div className="relative w-40 shrink-0 lg:w-48">
                            <CoverImage
                                loading="lazy"
                                decoding="async"
                                className="aspect-[9/13] w-full rounded-lg object-cover"
                                src={encodeURI(serieThumbnail(serieData))}
                                alt={serieData.visibleName}
                            />
                            {unreadBooks > 0 ? (
                                <span className={`absolute right-0 top-0 rounded-bl-md px-2 py-0.5 text-xs font-semibold text-white ${serieData.readlist ? "bg-accent" : "bg-primary"}`}>
                                    {unreadBooks} sin leer
                                </span>
                            ) : null}
                        </div>

                        <div className="flex min-w-0 flex-col items-start gap-2">
                            <h2 className="text-2xl font-bold text-fg lg:text-3xl">{serieData.visibleName}</h2>
                            <div className="flex flex-wrap items-center gap-2">
                                {serieData.status ? (
                                    <Badge variant={serieData.status === "PUBLISHING" ? "success" : "neutral"}>
                                        {serieData.status === "PUBLISHING" ? "En publicación" : "Finalizada"}
                                    </Badge>
                                ) : null}
                                {serieData.difficulty > 0 ? (
                                    <Badge variant="outline">Dificultad {serieData.difficulty.toFixed(1)}/10</Badge>
                                ) : null}
                                {serieData.paused ? <Badge variant="warning">Pausada</Badge> : null}
                            </div>
                            {serieBooks && serieBooks.length > 0 ? (
                                <p className="text-xs text-fg-muted">{getCharacterCount()}</p>
                            ) : null}

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <Button size="lg" icon={<Play className="size-4" fill="currentColor" />} onClick={()=>void continueReading()} loading={isFetching}>
                                    {ctaLabel}
                                </Button>
                                {userData?.admin ? (
                                    <span className="text-xs text-fg-muted">Gestiona la serie desde el menú ⋮</span>
                                ) : null}
                            </div>

                            {serieData.summary ? (
                                <div className="mt-3 text-sm text-fg-muted">
                                    <p
                                        className="overflow-hidden whitespace-pre-line"
                                        ref={overflowingText}
                                        style={{maxHeight:readMore ? "100%" : "11.25rem", transition:"max-height 0.3s ease"}}
                                    >
                                        {serieData.summary.replace(/(<([^>]+)>)/ig, "")}
                                    </p>
                                    {textOverflows ? (
                                        <button
                                            type="button"
                                            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                                            onClick={()=>setReadMore(!readMore)}
                                        >
                                            Leer {readMore ? "menos" : "más"}
                                            {readMore ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                                        </button>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="w-full shrink-0 lg:ml-auto lg:w-80">
                        <Reviews serieData={serieData} />
                    </div>
                </div>

                {/* Géneros y autores */}
                <div className="flex flex-col gap-3">
                    {serieData.genres.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="w-20 text-[11px] font-semibold uppercase tracking-wider text-fg-muted/80">Géneros</p>
                            {serieData.genres.map((genre)=>(
                                <Link
                                    key={genre}
                                    to={`/app/library/${serieData.variant === "manga" ? "manga" : "novels"}?genre=${encodeURIComponent(genre)}`}
                                    className="rounded-full border border-app-border px-3 py-1 text-xs font-medium text-fg-muted transition-colors hover:border-primary/50 hover:text-primary hover:no-underline"
                                >
                                    {genre}
                                </Link>
                            ))}
                        </div>
                    ) : null}
                    {serieData.authors.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="w-20 text-[11px] font-semibold uppercase tracking-wider text-fg-muted/80">Autores</p>
                            {serieData.authors.map((author)=>(
                                <Link
                                    key={author}
                                    to={`/app/library/${serieData.variant === "manga" ? "manga" : "novels"}?author=${encodeURIComponent(author)}`}
                                    className="rounded-full border border-app-border px-3 py-1 text-xs font-medium text-fg-muted transition-colors hover:border-primary/50 hover:text-primary hover:no-underline"
                                >
                                    {author}
                                </Link>
                            ))}
                        </div>
                    ) : null}
                </div>

                {/* Velocidad de lectura */}
                {id && serieData.unreadBooks !== serieData.bookCount && serieBooks ? (
                    <Accordion type="single" collapsible>
                        <AccordionItem value="speed" className="rounded-lg border border-app-border bg-app-surface px-4">
                            <AccordionTrigger>Tu velocidad de lectura</AccordionTrigger>
                            <AccordionContent>
                                <div className="pt-1">
                                    <SpeedGraph serieId={id} books={serieBooks} />
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                ) : null}

                {/* Volúmenes */}
                {serieBooks && serieBooks.length > 0 ? (
                    <ul className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-5">
                        {serieBooks.map((book, index)=>(
                            <li key={book._id} className="[content-visibility:auto] [contain-intrinsic-size:auto_260px]">
                                <CoverCard
                                    kind="book"
                                    book={book}
                                    insideSerie
                                    forceRead={unreadBooks === 0}
                                    blurred={(serieData.bookCount - unreadBooks) < index}
                                    noVariantIndicator
                                />
                            </li>
                        ))}
                    </ul>
                ) : (
                    <EmptyState title="Sin volúmenes" description="Esta serie todavía no tiene libros en la biblioteca." />
                )}
            </div>

            <RerollFab />
        </div>
    );
}

export default Serie;
