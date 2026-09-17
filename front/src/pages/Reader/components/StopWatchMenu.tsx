import {ChevronDown, ChevronUp, RotateCcw, Timer, TimerOff} from "lucide-react";
import React, {useState} from "react";
import {formatTime} from "../../../helpers/helpers";
import {createProgress} from "../../../helpers/progress";
import {useReaderTimerStore} from "../../../stores/ReaderStore";
import {confirmDialog} from "../../../stores/ConfirmStore";
import type {Book, BookProgress} from "../../../types/book";
import {Button} from "../../../ui/Button";
import {IconButton} from "../../../ui/IconButton";
import {Menu, MenuContent, MenuItem, MenuTrigger} from "../../../ui/Menu";
import {Separator} from "../../../ui/Separator";
import {Snackbar} from "../../../ui/Snackbar";
import {useQueryClient} from "@tanstack/react-query";
import {keys} from "../../../lib/queryKeys";

interface StopWatchMenuProps {
    oldProgress?:BookProgress | undefined;
    characters?:number;
    bookData?:Book;
    currentPage?:number;
    refreshProgress?:()=>Promise<number>;
}

export function StopWatchMenu({characters, bookData, oldProgress, currentPage, refreshProgress}:StopWatchMenuProps):React.ReactElement {
    const timer = useReaderTimerStore((state)=>state.timer);
    const timerOn = useReaderTimerStore((state)=>state.timerOn);
    const setTimer = useReaderTimerStore((state)=>state.setTimer);
    const toggleTimer = useReaderTimerStore((state)=>state.toggle);

    const [copied, setCopied] = useState(false);
    const [showAdjustTime, setShowAdjustTime] = useState(false);

    const queryClient = useQueryClient();

    // Los tomos sin OCR (carpeta de imágenes) no tienen contador de caracteres
    const showCharacters = (bookData?.characters ?? 0) > 0 || (characters ?? 0) > 0;

    async function resetTimer():Promise<void> {
        if (!await confirmDialog("¿Estás seguro de que quieres reiniciar el cronómetro?, esto reiniciará el tiempo de lectura del libro entero.")) return;

        if (bookData) {
            await createProgress(bookData, undefined, 1);
            window.localStorage.removeItem(bookData._id);
            await queryClient.invalidateQueries({queryKey:keys.bookProgress(bookData._id)});
        }
        setTimer(0);
    }

    function modifyTime(minutes:number):void {
        const currentSessionTime = timer - (oldProgress?.time || 0);

        if (currentSessionTime + (minutes * 60) < 0) {
            return;
        }

        setTimer(timer + (minutes * 60));
    }

    async function copySessionLog():Promise<void> {
        if (!bookData) return;

        let text = "";
        let currentChars = (characters || 0) - (oldProgress?.characters || 0);

        if (refreshProgress) {
            // Actualizar el progreso antes de copiar
            currentChars = await refreshProgress() - (oldProgress?.characters || 0);
        }

        if (bookData.variant === "novela") {
            text = `.log lectura ${currentChars} ${bookData.visibleName}`;
        } else if (bookData.variant === "manga" && !!currentPage) {
            const readPages = currentPage - (oldProgress?.currentPage || 0);
            text = `.log manga ${readPages} ${bookData.visibleName}`;
        }

        const currentTime = timer - (oldProgress?.time || 0);

        if (timer > 59) {
            text += `;${Math.floor(currentTime / 60)}`;
        }

        if (currentChars > 0 && bookData.variant === "manga") {
            text += `&${currentChars}`;
        }

        void navigator.clipboard.writeText(text);
        setCopied(true);
    }

    return (
        <>
            <Menu>
                <MenuTrigger asChild>
                    <IconButton label="Cronómetro" className="text-app-text">
                        {timerOn ? <Timer /> : <TimerOff />}
                    </IconButton>
                </MenuTrigger>
                <MenuContent align="end" className="min-w-[17rem] p-0">
                    <p className="px-3 py-2 text-center text-sm font-medium text-fg">
                        Tiempo: {formatTime(timer)}
                    </p>
                    <Separator />

                    {bookData ? (
                        <>
                            <button
                                type="button"
                                onClick={()=>void copySessionLog()}
                                className="flex w-full cursor-pointer flex-col items-center gap-0.5 px-3 py-2 text-center transition-colors hover:bg-tint"
                                title="Haz click para copiar el log de tu sesión actual"
                            >
                                <span className="text-sm font-medium text-fg">Sesión actual</span>
                                <span className="text-xs text-fg-muted">Tiempo: {formatTime(timer - (oldProgress?.time || 0))}</span>
                                {showCharacters ? (
                                    <span className="text-xs text-fg-muted">Caracteres: {(characters || 0) - (oldProgress?.characters || 0)}</span>
                                ) : null}
                            </button>

                            <Separator />
                        </>
                    ) : null}

                    <div className="flex flex-col gap-1 p-1">
                        <button
                            type="button"
                            onClick={()=>setShowAdjustTime((prev)=>!prev)}
                            className="flex items-center justify-center gap-1 rounded-md py-1.5 text-sm text-fg-muted transition-colors hover:bg-tint hover:text-fg"
                        >
                            Ajustar tiempo
                            {showAdjustTime ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
                        </button>
                        {showAdjustTime ? (
                            <div className="flex flex-col gap-1 px-1 pb-1" onDoubleClick={(e)=>e.stopPropagation()}>
                                <div className="flex justify-around text-xs text-fg-muted">
                                    <span>Restar</span>
                                    <span>Sumar</span>
                                </div>
                                <div className="flex justify-center gap-1">
                                    <Button variant="secondary" size="sm" onClick={()=>modifyTime(-5)}>-5m</Button>
                                    <Button variant="secondary" size="sm" onClick={()=>modifyTime(-1)}>-1m</Button>
                                    <Button variant="secondary" size="sm" onClick={()=>modifyTime(1)}>+1m</Button>
                                    <Button variant="secondary" size="sm" onClick={()=>modifyTime(5)}>+5m</Button>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <Separator />

                    {refreshProgress ? (
                        <MenuItem onSelect={()=>void refreshProgress()}>Actualizar caracteres leídos</MenuItem>
                    ) : null}
                    <MenuItem onSelect={toggleTimer}>
                        {timerOn ? "Pausar cronómetro" : "Iniciar cronómetro"}
                    </MenuItem>
                    <MenuItem onSelect={()=>void resetTimer()}>
                        <RotateCcw />
                        Reiniciar cronómetro
                    </MenuItem>
                </MenuContent>
            </Menu>

            <Snackbar open={copied} onOpenChange={setCopied} message="Log copiado al portapapeles" />
        </>
    );
}
