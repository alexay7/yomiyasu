import {Timer, TimerOff} from "@mui/icons-material";
import {IconButton, Menu, MenuItem} from "@mui/material";
import React, {useEffect, useState} from "react";
import {formatTime} from "../../../helpers/helpers";

interface StopWatchMenuProps {
    timer:number;
    setTimer:(v:React.SetStateAction<number>)=>void;
    timerOn:boolean;
    setTimerOn:(v:React.SetStateAction<boolean>)=>void
}

export function StopWatchMenu(props:StopWatchMenuProps):React.ReactElement {
    const {timer, setTimer, timerOn, setTimerOn} = props;
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    useEffect(() => {
        const timerInterval = setInterval(()=>{
            if (timerOn) {
                setTimer((prev)=>{
                    return (prev + 1);
                });
            }
        }, 1000);
        return () => clearInterval(timerInterval);
    }, [timerOn, setTimer]);

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
        setTimer(0);
    }

    return (
        <div className="">
            <IconButton onClick={handleClick}>
                {timerOn ? (
                    <Timer/>
                ) : (
                    <TimerOff/>
                )}
            </IconButton>
            <Menu id="stopwatch-menu" keepMounted anchorEl={anchorEl}
                open={Boolean(anchorEl)} onClose={handleClose} disableScrollLock={true}
            >
                <li style={{paddingTop:".25rem", paddingBottom:".25rem"}}>
                    <p style={{textAlign:"center"}}>{formatTime(timer)}</p>
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