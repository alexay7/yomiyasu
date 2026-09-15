import {useEffect} from "react";
import {create} from "zustand";

interface ReaderTimerState {
    timer:number;
    timerOn:boolean;
    start:()=>void;
    pause:()=>void;
    toggle:()=>void;
    setTimer:(value:number)=>void;
    reset:()=>void;
}

/**
 * Cronómetro de lectura compartido por el lector de manga y el de novelas.
 *
 * Vive fuera de React a propósito: el tick de 1 Hz solo re-renderiza los
 * componentes que muestran el tiempo (StopWatchMenu, indicador, ETA), no el
 * lector completo con sus barras e iframe.
 */
export const useReaderTimerStore = create<ReaderTimerState>((set) => ({
    timer:0,
    timerOn:false,
    start:()=>set({timerOn:true}),
    pause:()=>set({timerOn:false}),
    toggle:()=>set((state)=>({timerOn:!state.timerOn})),
    setTimer:(value)=>set({timer:value}),
    reset:()=>set({timer:0, timerOn:false})
}));

/** Arranca el intervalo de 1 s que incrementa el cronómetro (uno por lector montado). */
export function useReadingTimerTicker():void {
    useEffect(() => {
        const interval = window.setInterval(() => {
            const {timer, timerOn} = useReaderTimerStore.getState();

            if (timerOn) {
                useReaderTimerStore.setState({timer: timer + 1});
            }
        }, 1000);

        return () => window.clearInterval(interval);
    }, []);
}
