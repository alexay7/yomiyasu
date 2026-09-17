import {ArrowLeft, ChevronLeft, ChevronRight, Timer} from "lucide-react";
import React, {useState, type ReactNode} from "react";
import {formatTime} from "../../../helpers/helpers";
import {useReaderTimerStore} from "../../../stores/ReaderStore";
import type {Book} from "../../../types/book";
import {IconButton} from "../../../ui/IconButton";
import {Slider} from "../../../ui/Slider";
import {Tooltip} from "../../../ui/Tooltip";

/**
 * Piezas de UI compartidas por el lector de manga (remoto y local) para no
 * duplicar el chrome: barra superior, barra inferior con slider, flechas
 * móviles e indicadores del cronómetro.
 */

interface ReaderTopBarProps {
    title:string;
    onBack:()=>void;
    backLabel?:string;
    children?:ReactNode;
}

export function ReaderTopBar({title, onBack, backLabel = "Volver atrás", children}:ReaderTopBarProps):React.ReactElement {
    return (
        <div className="bg-app-chrome w-full h-[5vh] text-app-text flex items-center justify-between fixed top-0 gap-4 py-2 lg:py-1 z-20">
            <div className="flex items-center gap-2 px-2 shrink lg:w-1/2">
                <Tooltip content={backLabel}>
                    <IconButton label={backLabel} className="text-app-text" onClick={onBack}>
                        <ArrowLeft />
                    </IconButton>
                </Tooltip>
                <h1 className="text-lg lg:text-xl text-ellipsis overflow-hidden whitespace-nowrap max-w-[10ch] lg:max-w-[30ch]">{title}</h1>
            </div>
            <div className="flex items-center flex-row px-2 gap-1 grow lg:w-1/2 justify-end">
                {children}
            </div>
        </div>
    );
}

interface ReaderNavButtonProps {
    tooltip:string;
    onClick:()=>void;
    children:ReactNode;
}

export function ReaderNavButton({tooltip, onClick, children}:ReaderNavButtonProps):React.ReactElement {
    return (
        <Tooltip content={tooltip}>
            <IconButton label={tooltip} className="text-app-text" onClick={onClick}>
                {children}
            </IconButton>
        </Tooltip>
    );
}

interface ReaderBottomBarProps {
    /** Máximo del slider (páginas del libro, ajustado a portada/doble página). */
    maxPage:number;
    currentPage:number;
    onPageChange:(page:number)=>void;
    r2l:boolean;
    /** Controles del lado izquierdo (navegación y número de página). */
    left?:ReactNode;
    /** Controles del lado derecho. */
    right?:ReactNode;
    /** Contenido flotante sobre la barra (caracteres, tiempo restante…). */
    overlay?:ReactNode;
}

export function ReaderBottomBar({maxPage, currentPage, onPageChange, r2l, left, right, overlay}:ReaderBottomBarProps):React.ReactElement {
    const safeMax = Math.max(1, maxPage);
    const safeValue = Math.min(Math.max(currentPage, 1), safeMax);

    return (
        <div className="bg-app-chrome h-[5vh] w-full dark:text-app-text flex justify-center items-center fixed bottom-0 py-2 lg:py-0">
            {overlay}
            <div className="flex items-center">{left}</div>
            <Slider
                dir={r2l ? "rtl" : "ltr"}
                className="mx-4 w-1/2"
                min={1}
                max={safeMax}
                step={1}
                value={[safeValue]}
                onValueChange={(values)=>onPageChange(values[0])}
            />
            <div className="flex items-center">{right}</div>
        </div>
    );
}

interface MobilePageArrowsProps {
    currentPage:number;
    pages:number;
    visible:boolean;
    onPrev:()=>void;
    onNext:()=>void;
}

export function MobilePageArrows({currentPage, pages, visible, onPrev, onNext}:MobilePageArrowsProps):React.ReactElement | null {
    if (!visible) return null;

    return (
        <div className="fixed bottom-0 flex justify-around items-center w-full py-2 opacity-70">
            <IconButton
                label="Página anterior"
                className="w-1/3"
                onClick={onPrev}
            >
                <ChevronLeft className="text-white" />
            </IconButton>
            <p className="text-[#ebe8e3] font-semibold text-lg" style={{textShadow:"-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black"}}>{currentPage} / {pages}</p>
            <IconButton
                label="Página siguiente"
                className="w-1/3"
                onClick={onNext}
            >
                <ChevronRight className="text-white" />
            </IconButton>
        </div>
    );
}

/** Indicador pulsante del cronómetro activo (solo se suscribe al timer). */
export function ReadingTimerIndicator({enabled}:{enabled:boolean}):React.ReactElement | null {
    const timerOn = useReaderTimerStore((state)=>state.timerOn);

    if (!enabled || !timerOn) return null;

    return (
        <div className="opacity-60 z-10">
            <Timer className="text-primary w-6 h-6 animate-pulse absolute top-2 right-2"/>
        </div>
    );
}

interface ReaderStatsReadoutProps {
    bookData:Book;
    currentPage:number;
    doublePages:boolean;
}

/**
 * Bloque "Caracteres leídos / Tiempo restante estimado" de la barra inferior.
 * Se aísla en su propio componente para que el tick del cronómetro no
 * re-renderice el lector entero.
 */
export function ReaderStatsReadout({bookData, currentPage}:ReaderStatsReadoutProps):React.ReactElement | null {
    const timer = useReaderTimerStore((state)=>state.timer);
    const [showTimeLeft, setShowTimeLeft] = useState(false);

    if (!bookData.pageChars || bookData.pageChars.length === 0) return null;

    const currentCharacters = (()=>{
        if (currentPage > 1) {
            return bookData.pageChars![currentPage - 1];
        }
        return bookData.pageChars![0];
    })();

    const timeLeft = (()=>{
        if (!bookData.characters) return "";

        const readChars = bookData.pageChars![currentPage];
        let speed = readChars / timer;
        if (speed <= 0) speed = 1;

        const charactersLeft = bookData.characters - bookData.pageChars![currentPage];
        return formatTime(charactersLeft / speed);
    })();

    return (
        <div
            className="absolute -top-6 right-1 text-white text-sm select-none font-bold cursor-pointer"
            onClick={()=>setShowTimeLeft((prev)=>!prev)}
            style={{textShadow:"-1px 0 #787878, 0 1px #787878, 1px 0 #787878, 0 -1px #787878"}}
        >
            {showTimeLeft ? (
                <p><span className="text-xs">Tiempo restante estimado: {timeLeft}</span></p>
            ) : (
                <p><span className="text-xs">Caracteres leídos:</span> {currentCharacters} / {bookData.characters}</p>
            )}
        </div>
    );
}
