import {CircleArrowLeft, CircleArrowRight, CircleQuestionMark, Maximize, Minimize, Settings, SkipBack, SkipForward} from "lucide-react";
import React, {Fragment, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useNavigate} from "react-router";
import {toast} from "react-toastify";
import {nextBook, prevBook} from "../../../helpers/book";
import {useFullscreen} from "../../../helpers/useFullscreen";
import {bookPageUrl} from "../../../lib/media";
import {useMediaQuery} from "../../../lib/useMediaQuery";
import {confirmDialog} from "../../../stores/ConfirmStore";
import {notifyReadingActivity, useReaderTimerStore} from "../../../stores/ReaderStore";
import {useSettingsStore} from "../../../stores/SettingsStore";
import type {Book, BookProgress} from "../../../types/book";
import {cn} from "../../../ui/cn";
import {MobilePageArrows, ReaderBottomBar, ReaderNavButton, ReaderTopBar, ReadingTimerIndicator} from "./ReaderChrome";
import {StopWatchMenu} from "./StopWatchMenu";

/**
 * Lector de tomos sin mokuro: una carpeta de imágenes sin html ni texto OCR.
 * Reutiliza el chrome, el cronómetro y el progreso del lector de manga, pero
 * pagina con <img> en lugar del iframe de mokuro.
 */

type ImageReaderProps = {
    readerVars:{
        bookData:Book;
        bookProgress?:BookProgress;
        currentPage:number;
        setCurrentPage:(page:number)=>void;
        showSettings:boolean;
        setShowSettings:(v:boolean)=>void;
        setShowShortcuts:(v:React.SetStateAction<boolean>)=>void;
        /** Guarda el progreso actual (lo gestiona el contenedor Reader). */
        saveProgress:(keepAlive?:boolean)=>Promise<void>;
    }
}

/** Agrupa páginas (1-based) en spreads según doble página y portada. */
function buildSpreads(pages:number, doublePage:boolean, hasCover:boolean):number[][] {
    const spreads:number[][] = [];
    let index = 1;

    if (doublePage && hasCover && pages > 0) {
        spreads.push([1]);
        index = 2;
    }

    while (index <= pages) {
        if (doublePage && index + 1 <= pages) {
            spreads.push([index, index + 1]);
            index += 2;
        } else {
            spreads.push([index]);
            index += 1;
        }
    }

    return spreads.length > 0 ? spreads : [[]];
}

function spreadIndexForPage(spreads:number[][], page:number):number {
    const index = spreads.findIndex((spread)=>spread.includes(page));

    return index === -1 ? 0 : index;
}

const ZOOM_MODES = ["fit to screen", "fit to width", "original size", "keep zoom level"] as const;

export default function ImageReader({readerVars:{bookData, bookProgress, currentPage, setCurrentPage,
    setShowSettings, setShowShortcuts, saveProgress
}}:ImageReaderProps):React.ReactElement{
    const {readerSettings, siteSettings, modifyReaderSettings} = useSettingsStore();
    const {isFullscreen, toggleFullscreen} = useFullscreen();
    const navigate = useNavigate();
    const isTabletOrMobile = useMediaQuery("(max-width: 1224px)");

    const [showToolBar, setShowToolbar] = useState(true);
    const [zoom, setZoom] = useState(1);
    const [naturalWidths, setNaturalWidths] = useState<Record<number, number>>({});

    const areaRef = useRef<HTMLDivElement>(null);
    const touchStart = useRef<{x:number, y:number} | null>(null);

    const pagePaths = useMemo(()=>bookData.pagePaths ?? [], [bookData.pagePaths]);
    const doublePages = !readerSettings.singlePageView;
    const spreads = useMemo(
        ()=>buildSpreads(pagePaths.length, doublePages, readerSettings.hasCover),
        [pagePaths.length, doublePages, readerSettings.hasCover]
    );
    const spreadIndex = spreadIndexForPage(spreads, currentPage);
    const zoomMode = readerSettings.defaultZoomMode;
    const keepZoom = zoomMode === "keep zoom level";

    // Resetea el zoom al cambiar de página salvo en modo "mantener zoom"
    const lastSpreadIndex = useRef(spreadIndex);

    useEffect(()=>{
        if (lastSpreadIndex.current === spreadIndex) return;

        lastSpreadIndex.current = spreadIndex;

        if (!keepZoom) setZoom(1);
    }, [spreadIndex, keepZoom]);

    const goToSpread = useCallback((index:number):void=>{
        if (index < 0) {
            void (async()=>{
                if (!await confirmDialog("¿Volver al libro anterior?")) return;

                await saveProgress();
                await prevBook({book:bookData, variant:"manga", navigate});
            })();
            return;
        }

        if (index >= spreads.length) {
            void (async()=>{
                if (!await confirmDialog("¿Pasar al siguiente libro?")) return;

                await saveProgress();
                await nextBook({book:bookData, variant:"manga", navigate});
            })();
            return;
        }

        const target = spreads[index][0];

        if (!target) return;

        notifyReadingActivity();

        if (siteSettings.startCronoOnPage && !useReaderTimerStore.getState().timerOn) {
            useReaderTimerStore.getState().start();
        }

        setCurrentPage(target);
    }, [bookData, navigate, saveProgress, setCurrentPage, siteSettings.startCronoOnPage, spreads]);

    const goNext = useCallback(()=>goToSpread(spreadIndex + 1), [goToSpread, spreadIndex]);
    const goPrev = useCallback(()=>goToSpread(spreadIndex - 1), [goToSpread, spreadIndex]);
    const goToPage = useCallback((page:number)=>goToSpread(spreadIndexForPage(spreads, page)), [goToSpread, spreads]);

    // Precarga las siguientes páginas
    useEffect(()=>{
        for (let index = currentPage; index < currentPage + 3; index++) {
            const path = pagePaths[index];

            if (!path) continue;

            const image = new Image();
            image.src = bookPageUrl(bookData, path);
        }
    }, [bookData, currentPage, pagePaths]);

    // Zoom con Ctrl/rueda y navegación con rueda (si está activada)
    useEffect(()=>{
        const area = areaRef.current;

        if (!area) return;

        function handleWheel(e:WheelEvent):void {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                setZoom((prev)=>Math.min(6, Math.max(1, prev + (e.deltaY < 0 ? 0.25 : -0.25))));
                return;
            }

            if (readerSettings.scrollChange && zoom === 1 && zoomMode === "fit to screen") {
                e.preventDefault();
                if (e.deltaY > 0) goNext(); else goPrev();
            }
        }

        area.addEventListener("wheel", handleWheel, {passive:false});

        return ()=>area.removeEventListener("wheel", handleWheel);
    }, [goNext, goPrev, readerSettings.scrollChange, zoom, zoomMode]);

    useEffect(()=>{
        function handleKeyDown(e:KeyboardEvent):void {
            const target = e.target as HTMLElement | null;

            if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;

            switch (e.key) {
                case "ArrowLeft":
                case " ":{
                    if (readerSettings.r2l) goNext(); else goPrev();
                    break;
                }
                case "ArrowRight":{
                    if (readerSettings.r2l) goPrev(); else goNext();
                    break;
                }
                case "t":{
                    useReaderTimerStore.getState().toggle();
                    break;
                }
                case "d":{
                    modifyReaderSettings("singlePageView", !readerSettings.singlePageView);
                    toast.success(`Doble página ${readerSettings.singlePageView ? "activada" : "desactivada"}`);
                    break;
                }
                case "z":{
                    modifyReaderSettings("panAndZoom", !readerSettings.panAndZoom);
                    toast.success(readerSettings.panAndZoom ? "Zoom&Pan desactivado" : "Zoom&Pan activado");
                    break;
                }
                case "m":{
                    const zoomIndex = ZOOM_MODES.indexOf(zoomMode);
                    const newZoom = ZOOM_MODES[(zoomIndex + 1) % ZOOM_MODES.length];

                    modifyReaderSettings("defaultZoomMode", newZoom);
                    toast.success(`Nuevo modo de zoom: ${newZoom}`);
                    break;
                }
                case "f":{
                    toggleFullscreen();
                    break;
                }
                case "?":{
                    setShowShortcuts((prev)=>!prev);
                    break;
                }
            }
        }

        addEventListener("keydown", handleKeyDown);

        return ()=>removeEventListener("keydown", handleKeyDown);
    }, [goNext, goPrev, modifyReaderSettings, readerSettings.r2l, readerSettings.singlePageView, readerSettings.panAndZoom, setShowShortcuts, toggleFullscreen, zoomMode]);

    function handleTouchStart(e:React.TouchEvent<HTMLDivElement>):void {
        if (e.touches.length !== 1) {
            touchStart.current = null;
            return;
        }

        touchStart.current = {x:e.touches[0].clientX, y:e.touches[0].clientY};
    }

    function handleTouchEnd(e:React.TouchEvent<HTMLDivElement>):void {
        const start = touchStart.current;
        touchStart.current = null;

        if (!start || e.changedTouches.length !== 1) return;

        const dx = e.changedTouches[0].clientX - start.x;
        const dy = e.changedTouches[0].clientY - start.y;

        if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;

        // En r2l deslizar hacia la izquierda avanza la lectura
        if (readerSettings.r2l ? dx < 0 : dx > 0) goNext(); else goPrev();
    }

    function handleAreaClick(e:React.MouseEvent<HTMLDivElement>):void {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const third = rect.width / 3;

        if (x < third) {
            if (readerSettings.r2l) goNext(); else goPrev();
            return;
        }

        if (x > third * 2) {
            if (readerSettings.r2l) goPrev(); else goNext();
            return;
        }

        setShowToolbar((prev)=>!prev);
    }

    function handleImageLoad(pageNumber:number, image:HTMLImageElement):void {
        setNaturalWidths((prev)=>{
            if (prev[pageNumber] === image.naturalWidth) return prev;

            return {...prev, [pageNumber]:image.naturalWidth};
        });
    }

    function imageStyle(pageNumber:number):React.CSSProperties {
        const naturalWidth = naturalWidths[pageNumber];

        if (zoomMode === "original size" && naturalWidth) {
            return {width:naturalWidth * zoom, maxWidth:"none", maxHeight:"none"};
        }

        if (zoomMode === "fit to width" || zoom > 1) {
            return {width:`${zoom * 100}%`, height:"auto", maxWidth:"none", maxHeight:"none"};
        }

        // Ajustar a pantalla (y mantener zoom): la página ocupa todo el alto
        // disponible y se encoge si es más ancha que el hueco.
        return {height:"100%", width:"auto", maxWidth:"100%", objectFit:"contain"};
    }

    function getTotalPages():number {
        if (readerSettings.r2l && readerSettings.hasCover && !readerSettings.singlePageView) {
            return bookData.pages - 1;
        }

        return bookData.pages;
    }

    function getCurrentPage():number {
        if (currentPage === 0) return 1;

        return currentPage;
    }

    const fitCentered = zoom === 1 && (zoomMode === "fit to screen" || keepZoom);
    const sliderMax = readerSettings.hasCover && !readerSettings.singlePageView ? bookData.pages - 1 : bookData.pages;
    const currentSpread = spreads[spreadIndex] ?? [];

    if (pagePaths.length === 0) {
        return (
            <div className="flex h-[100svh] items-center justify-center text-app-text">
                <p>Este tomo no tiene imágenes.</p>
            </div>
        );
    }

    return(
        <Fragment>
            {showToolBar && (
                <ReaderTopBar
                    title={bookData.visibleName}
                    onBack={()=>{
                        void (async()=>{
                            await saveProgress();
                            navigate(-1);
                        })();
                    }}
                >
                    <StopWatchMenu characters={0} oldProgress={bookProgress} bookData={bookData} currentPage={currentPage}/>
                    <ReaderNavButton tooltip="Atajos de teclado (?)" onClick={()=>setShowShortcuts(true)}>
                        <CircleQuestionMark />
                    </ReaderNavButton>
                    <ReaderNavButton
                        tooltip={isFullscreen ? "Salir de pantalla completa (f)" : "Pantalla completa (f)"}
                        onClick={toggleFullscreen}
                    >
                        {isFullscreen ? <Minimize /> : <Maximize />}
                    </ReaderNavButton>
                    <ReaderNavButton tooltip="Ajustes del lector" onClick={()=>setShowSettings(true)}>
                        <Settings />
                    </ReaderNavButton>
                </ReaderTopBar>
            )}
            <div
                ref={areaRef}
                className={cn(
                    "flex h-[100svh] w-full items-stretch justify-center overflow-hidden bg-black",
                    showToolBar && "pt-[5vh] pb-[5vh]",
                )}
                onClick={handleAreaClick}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {currentSpread.map((pageNumber)=>{
                    const pagePath = pagePaths[pageNumber - 1];

                    if (!pagePath) return null;

                    return (
                        <div
                            key={pageNumber}
                            className={cn(
                                "h-full min-w-0",
                                // Ajustar a pantalla: cada página ocupa solo su
                                // ancho real y el par se centra junto, sin hueco
                                // entre ambas. En el resto de modos cada página
                                // tiene su propia mitad con scroll.
                                fitCentered
                                    ? "flex shrink items-center justify-center overflow-hidden"
                                    : "flex flex-1 items-start justify-center overflow-auto",
                            )}
                        >
                            <img
                                src={bookPageUrl(bookData, pagePath)}
                                alt={`Página ${pageNumber}`}
                                className={cn(
                                    "mx-auto block min-w-0 select-none",
                                    fitCentered && "h-full w-auto max-w-full object-contain",
                                )}
                                style={fitCentered ? undefined : imageStyle(pageNumber)}
                                draggable={false}
                                onLoad={(e)=>handleImageLoad(pageNumber, e.currentTarget)}
                            />
                        </div>
                    );
                })}
            </div>
            <ReadingTimerIndicator enabled={siteSettings.showCrono}/>
            <MobilePageArrows
                currentPage={getCurrentPage()}
                pages={bookData.pages}
                visible={!showToolBar && isTabletOrMobile}
                onPrev={goPrev}
                onNext={goNext}
            />
            {showToolBar && (
                <ReaderBottomBar
                    r2l={readerSettings.r2l}
                    currentPage={getCurrentPage()}
                    maxPage={sliderMax}
                    onPageChange={goToPage}
                    left={readerSettings.r2l ? (
                        <Fragment>
                            <ReaderNavButton tooltip="Ir al siguiente libro" onClick={()=>void (async()=>{await saveProgress(); await nextBook({book:bookData, variant:"manga", navigate});})()}>
                                <CircleArrowLeft />
                            </ReaderNavButton>
                            <ReaderNavButton tooltip="Ir a la última página" onClick={()=>goToSpread(spreads.length - 1)}>
                                <SkipBack />
                            </ReaderNavButton>
                            <p>{getTotalPages()}</p>
                        </Fragment>
                    ) : (
                        <Fragment>
                            <ReaderNavButton tooltip="Ir al libro anterior" onClick={()=>void (async()=>{await saveProgress(); await prevBook({book:bookData, variant:"manga", navigate});})()}>
                                <CircleArrowLeft />
                            </ReaderNavButton>
                            <ReaderNavButton tooltip="Ir a la primera página" onClick={()=>goToSpread(0)}>
                                <SkipBack />
                            </ReaderNavButton>
                            <p>{getCurrentPage()}</p>
                        </Fragment>
                    )}
                    right={!readerSettings.r2l ? (
                        <Fragment>
                            <p>{getTotalPages()}</p>
                            <ReaderNavButton tooltip="Ir a la última página" onClick={()=>goToSpread(spreads.length - 1)}>
                                <SkipForward />
                            </ReaderNavButton>
                            <ReaderNavButton tooltip="Ir al siguiente libro" onClick={()=>void (async()=>{await saveProgress(); await nextBook({book:bookData, variant:"manga", navigate});})()}>
                                <CircleArrowRight />
                            </ReaderNavButton>
                        </Fragment>
                    ) : (
                        <Fragment>
                            <p>{getCurrentPage()}</p>
                            <ReaderNavButton tooltip="Ir a la primera página" onClick={()=>goToSpread(0)}>
                                <SkipForward />
                            </ReaderNavButton>
                            <ReaderNavButton tooltip="Ir al libro anterior" onClick={()=>void (async()=>{await saveProgress(); await prevBook({book:bookData, variant:"manga", navigate});})()}>
                                <CircleArrowRight />
                            </ReaderNavButton>
                        </Fragment>
                    )}
                />
            )}
        </Fragment>
    );
}
