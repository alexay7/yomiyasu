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

// ---------------------------------------------------------------------------
// Auto-pausa por inactividad
//
// El "latido" es la actividad de lectura (pasar página en manga, scroll o
// interacción en novelas), no el movimiento del ratón: consultar el diccionario
// o dejar la pestaña abierta no debe mantener el cronómetro corriendo. Si el
// cronómetro se pausó por inactividad, la siguiente actividad de lectura lo
// reanuda; las pausas manuales nunca se reanudan solas.
// ---------------------------------------------------------------------------

let lastReadingActivity = Date.now();
let idlePaused = false;

/** Registra actividad de lectura y reanuda el cronómetro si se pausó por inactividad. */
export function notifyReadingActivity():void {
    lastReadingActivity = Date.now();

    if (idlePaused) {
        idlePaused = false;
        useReaderTimerStore.getState().start();
    }
}

/**
 * Pausa el cronómetro tras `timeoutMinutes` minutos sin actividad de lectura.
 * Un valor de 0 (o menor) lo desactiva.
 */
export function useIdleTimerPause(timeoutMinutes:number):void {
    useEffect(() => {
        if (!timeoutMinutes || timeoutMinutes <= 0) return;

        lastReadingActivity = Date.now();
        idlePaused = false;

        let wasRunning = useReaderTimerStore.getState().timerOn;

        const interval = window.setInterval(() => {
            const {timerOn} = useReaderTimerStore.getState();

            // Reanudación (manual o automática): el tiempo de inactividad cuenta de nuevo
            if (timerOn && !wasRunning) {
                lastReadingActivity = Date.now();
                idlePaused = false;
            }

            wasRunning = timerOn;

            if (timerOn && !idlePaused && Date.now() - lastReadingActivity >= timeoutMinutes * 60_000) {
                idlePaused = true;
                useReaderTimerStore.getState().pause();
            }
        }, 1000);

        return () => {
            window.clearInterval(interval);
            idlePaused = false;
        };
    }, [timeoutMinutes]);
}
