import {ArrowDropDown, ArrowDropUp, Timer, TimerOff} from "@mui/icons-material";
import {Alert, IconButton, Menu, MenuItem, Snackbar, Tooltip} from "@mui/material";
import React, {useState} from "react";
import {formatTime} from "../../../helpers/helpers";
import {createProgress} from "../../../helpers/progress";
import {Book, BookProgress} from "../../../types/book";
import {useQueryClient} from "react-query";


interface StopWatchMenuProps {
    oldProgress?:BookProgress | undefined;
    characters?:number;
    bookData?:Book;
    timer:number;
    setTimer:(v:React.SetStateAction<number>)=>void;
    timerOn:boolean;
    setTimerOn:(v:React.SetStateAction<boolean>)=>void;
    currentPage?:number;
    refreshProgress?:()=>Promise<number>;
}

export function StopWatchMenu({timer, setTimer, characters, timerOn, setTimerOn, bookData, oldProgress,
    currentPage, refreshProgress}:StopWatchMenuProps):React.ReactElement {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [copied, setCopied] = useState(false);
    const [showAdjustTime, setShowAdjustTime] = useState(false);

    const queryClient = useQueryClient();

    function handleClick(event: React.MouseEvent<HTMLElement>):void {
        setAnchorEl(event.currentTarget);
    }

    function handleClose():void {
        setAnchorEl(null);
    }

    function stopTimer():void {
        setTimerOn(false);
    }

    function startTimer():void {
        setTimerOn(true);
    }

    async function resetTimer():Promise<void> {
        // Confirmation from the user
        if (!window.confirm("¿Estás seguro de que quieres reiniciar el cronómetro?, esto reiniciará el tiempo de lectura del libro entero.")) return;

        if (bookData) {
            await createProgress(bookData, undefined, 1);
            window.localStorage.removeItem(bookData._id);
            await queryClient.invalidateQueries([`progress-${bookData._id}`]);
        }
        setTimer(0);
    }

    function modifyTime(minutes:number):void {
        const currentSessionTime = timer - (oldProgress?.time || 0);

        if (currentSessionTime + (minutes * 60) < 0) {
            return;
        }

        setTimer((prev)=>prev + (minutes * 60));
    }

    return (
        <div className="">
            <Tooltip title="Cronómetro">
                <IconButton onClick={handleClick} className="dark:text-[#ebe8e3] text-[#0000008a]">
                    {timerOn ? (
                        <Timer/>
                    ) : (
                        <TimerOff/>
                    )}
                </IconButton>
            </Tooltip>
            <Menu id="stopwatch-menu" keepMounted anchorEl={anchorEl}
                open={Boolean(anchorEl)} onClose={handleClose} disableScrollLock={true}
            >
                <li style={{paddingTop:".25rem", paddingBottom:".25rem"}}>
                    <p style={{textAlign:"center"}}>Tiempo: {formatTime(timer)}</p>
                </li>
                <hr/>
                <li className="flex flex-col items-center justify-center gap-1">
                    <Tooltip title="Haz click para copiar el log de tu sesión actual">
                        <div className="cursor-cell w-full flex flex-col items-center justify-center" onClick={async()=>{
                            if (!bookData) return;

                            let text = "";

                            let currentChars = characters||0 - (oldProgress?.characters || 0);

                            if (refreshProgress) {
                                // Actualizar el progreso antes de copiar
                                currentChars = await refreshProgress() - (oldProgress?.characters || 0);
                            }

                            if (bookData?.variant === "novela") {
                                text = `.log lectura ${currentChars} ${bookData?.visibleName}`;
                            } else if (bookData?.variant === "manga" && !!currentPage) {
                                const readPages = currentPage - (oldProgress?.currentPage || 0);
                                text = `.log manga ${readPages} ${bookData.visibleName}`;
                            }

                            const currentTime = timer - (oldProgress?.time || 0);

                            if (timer > 59) {
                                text += `;${Math.floor(currentTime / 60)}`;
                            }

                            if (currentChars > 0 && bookData?.variant === "manga") {
                                text += `&${currentChars}`;
                            }

                            void navigator.clipboard.writeText(text);
                            setCopied(true);
                        }}
                        >
                            <p>Sesión Actual</p>
                            <p className="text-xs">Tiempo: {formatTime(timer - (oldProgress?.time || 0))}</p>
                            <p className="text-xs">Caracteres: {characters||0 - (oldProgress?.characters || 0)}</p>
                        </div>
                    </Tooltip>
                </li>
                <hr />
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col items-center">
                        <button className="bg-transparent text-white border-none cursor-pointer text-base" onClick={()=>setShowAdjustTime((prev)=>!prev)}>
                            <p className="flex items-center">Ajustar tiempo {showAdjustTime ? <ArrowDropDown/> : <ArrowDropUp/>}</p>
                        </button>
                        {showAdjustTime && (
                            <div className="flex flex-col" onDoubleClick={(e)=>{
                                e.stopPropagation();
                            }}
                            >
                                <div className="flex justify-around text-sm">
                                    <p>Restar</p>
                                    <p>Sumar</p>
                                </div>
                                <div>
                                    <button className="bg-white text-black border-primary border-solid border-r-0 rounded-l-md hover:bg-primary hover:text-white cursor-pointer duration-150" onClick={()=>modifyTime(-5)}>-5m</button>
                                    <button className="bg-white text-black border-primary border-solid border-l-0 hover:bg-primary hover:text-white cursor-pointer duration-150" onClick={()=>modifyTime(-1)}>-1m</button>
                                    <button className="bg-white text-black border-primary border-solid border-r-0 hover:bg-primary hover:text-white cursor-pointer duration-150" onClick={()=>modifyTime(1)}>+1m</button>
                                    <button className="bg-white text-black border-primary border-solid border-l-0 rounded-r-md hover:bg-primary hover:text-white cursor-pointer duration-150" onClick={()=>modifyTime(5)}>+5m</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <hr />
                {!!refreshProgress && (
                    <MenuItem onClick={refreshProgress}>Actualizar caracteres leídos</MenuItem>
                )}
                {!timerOn ? (
                    <MenuItem onClick={startTimer}>Iniciar Cronómetro</MenuItem>
                ) : (
                    <MenuItem onClick={stopTimer}>Pausar Cronómetro</MenuItem>
                )}
                <MenuItem onClick={resetTimer}>Reiniciar Cronómetro</MenuItem>
            </Menu>
            <Snackbar
                open={copied}
                autoHideDuration={2000}
                onClose={()=>setCopied(false)}
            >
                <Alert severity="success">Log copiado al portapapeles</Alert>
            </Snackbar>
        </div>
    );
}