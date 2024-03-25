import {Timer, TimerOff} from "@mui/icons-material";
import {IconButton, Menu, MenuItem, Tooltip} from "@mui/material";
import React, {useState} from "react";
import {formatTime} from "../../../helpers/helpers";
import {createProgress} from "../../../helpers/progress";
import {Book, BookProgress} from "../../../types/book";


interface StopWatchMenuProps {
    oldProgress:BookProgress | undefined;
    characters:number;
    bookData?:Book;
    timer:number;
    setTimer:(v:React.SetStateAction<number>)=>void;
    timerOn:boolean;
    setTimerOn:(v:React.SetStateAction<boolean>)=>void;
}

export function StopWatchMenu({timer, setTimer, characters, timerOn, setTimerOn, bookData, oldProgress}:StopWatchMenuProps):React.ReactElement {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

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

    function resetTimer():void {
        // Confirmation from the user
        if (!window.confirm("¿Estás seguro de que quieres reiniciar el cronómetro?")) return;

        if (bookData) {
            void createProgress(bookData, undefined, 1);
            window.localStorage.removeItem(bookData._id);
        }
        setTimer(0);
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
                <li className="flex flex-col items-center justify-center">
                    <p>Sesión Actual</p>
                    <p className="text-xs">Tiempo: {formatTime(timer - (oldProgress?.time || 0))}</p>
                    <p className="text-xs">Caracteres: {characters - (oldProgress?.characters || 0)}</p>
                </li>
                <hr />
                {!timerOn ? (
                    <MenuItem onClick={startTimer}>Iniciar Cronómetro</MenuItem>
                ) : (
                    <MenuItem onClick={stopTimer}>Pausar Cronómetro</MenuItem>
                )}
                <MenuItem onClick={resetTimer}>Reiniciar Cronómetro</MenuItem>
            </Menu>
        </div>
    );
}