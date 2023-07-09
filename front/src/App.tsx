import React, {useEffect, useRef, useState} from "react";
import "./App.css";

export function App():React.ReactElement {
    const path = "api/yotsubato/Yotsuba%20to!%2013.html";

    window.localStorage.setItem("currentTime", "0");

    const initial_vol = JSON.parse(window.localStorage[`mokuro_/${path}`] || "{\"page_idx\":0}") as {page_idx:number};

    const initial_page = initial_vol.page_idx + 1;

    const [currentPage, setCurrentPage] = useState(initial_page);
    const [timerOn, setTimerOn] = useState(false);
    const [timer, setTimer] = useState(0);
    const iframe = useRef<HTMLIFrameElement>(null);

    async function updateProgress():Promise<void> {
        const current_vol = JSON.parse(window.localStorage[`mokuro_/${path}`] || "{\"page_idx\":0}") as {page_idx:number};

        const current_page = current_vol.page_idx + 1;
        const time = parseInt(window.localStorage.getItem("currentTime") || "0");
        await fetch("http://localhost:3001/api", {method:"POST", body:JSON.stringify({"page":current_page, "time":time}), headers:{"Content-Type":"application/json"}, keepalive:true});
    }

    useEffect(() => {
        const handleBeforeUnload = async():Promise<void> => {
            // Save before leaving the page
            await updateProgress();
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, []);

    useEffect(() => {
        const timerInterval = setInterval(()=>{
            if (timerOn) {
                setTimer((prev)=>{
                    window.localStorage.setItem("currentTime", `${prev + 1}`);
                    return (prev + 1);
                });
            }
        }, 1000);
        return () => clearInterval(timerInterval);
    }, [timerOn, setCurrentPage]);

    useEffect(()=>{
        const interval = setInterval(async()=>{
            // Save every 5 minutes
            const current_vol = JSON.parse(window.localStorage[`mokuro_/${path}`] || "{\"page_idx\":0}") as {page_idx:number};

            const current_page = current_vol.page_idx + 1;
            let pageChanged = false;
            setCurrentPage((prev)=>{
                if (prev !== current_page) {
                    // Detectado cambio de página
                    pageChanged = true;
                    return current_page;
                }
                return prev;
            });

            if (pageChanged || timerOn) {
                await updateProgress();
            }
        }, 1000 * 60 * 5);
        return ()=> clearInterval(interval);
    }, [timerOn, timer]);

    function stopTimer():void {
        setTimerOn(false);
    }

    function startTimer():void {
        setTimerOn(true);
    }

    function resetTimer():void {
        setTimer(0);
    }

    function addLeadingZero(value: number): string {
        return value.toString().padStart(2, "0");
    }

    function formatTime(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;

        const formattedHours = addLeadingZero(hours);
        const formattedMinutes = addLeadingZero(minutes);
        const formattedSeconds = addLeadingZero(remainingSeconds);

        return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
    }

    let {hostname} = window.location;

    if (window.location.hostname === "localhost") {
        hostname = `http://${hostname}`;
    } else {
        hostname = `https://${hostname}`;
    }

    return (
        <div className="App">
            <h1>Estás en la página {currentPage} y yo soy el frontend y lo se todo</h1>
            <div style={{display:"flex", flexDirection:"column"}}>
                <p>{formatTime(timer)}</p>
                <div className="">
                    <button onClick={resetTimer}>Reiniciar cronómetro</button>
                    {timerOn ? (
                        <button onClick={stopTimer}>Parar cronómetro</button>
                    ) : (
                        <button onClick={startTimer}>Iniciar cronómetro</button>
                    )}
                </div>
            </div>
            <iframe
                ref={iframe}
                src={`${hostname}/api/static/yotsubato/Yotsuba%20to!%2013.html`}
                title="yotsubato"
                width={1024}
                height={800}
            />
            <iframe
                src={`${hostname}/api/static/yotsubato/Yotsuba%20to!%2014.html`}
                title="yotsubato 14"
                width={1024}
                height={800}
            />
        </div>
    );
}
