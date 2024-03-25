import React, {useState} from "react";
import {useQuery} from "react-query";
import {api} from "../../../api/api";
import {CSSTransition} from "react-transition-group";

import "./styles.css";

function GeneralStats():React.ReactElement {
    const [details, setDetails] = useState(false);

    const {data:generalStats} = useQuery("mystats", async()=>{
        return api.get<{totalMangaBooks:number, totalNovelaBooks:number, totalMangaSeries:number, totalNovelaSeries:number, totalPagesRead:number, totalCharacters:number, totalTimeRead:number}>("readprogress/mystats");
    });

    function formatTime(minutes?:number):string {
        if (!minutes) {
            return "0";
        }
        // Minutos
        if (minutes < 60) {
            return minutes.toLocaleString(undefined, {maximumFractionDigits:1});
        }

        // Horas
        return (minutes / 60).toLocaleString(undefined, {maximumFractionDigits:1});
    }

    function formatTimeText(minutes?:number):string {
        if (!minutes) {
            return "Minutos leídos";
        }
        // Minutos
        if (minutes < 60) {
            return "Minutos leídos";
        }

        return "Horas leídas";
    }

    return (
        <div>
            {generalStats === undefined ? <p>Cargando...</p> : (
                <div className="flex flex-col">
                    <div className="flex flex-col gap-2 pb-4">
                        <div className="flex gap-2 items-end">
                            <h2 className="dark:text-white text-black">Estadísticas generales</h2>
                            <button className="bg-transparent border-none dark:text-white cursor-pointer hover:underline" onClick={()=>{
                                setDetails((prev)=>!prev);
                            }}
                            >{details ? "Ocultar" : "Ver"} detalles
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-4 items-center">
                            <div className="flex flex-col gap-2 bg-gray-100 dark:bg-opacity-20 p-4 rounded-md">
                                <p className="text-primary text-4xl font-bold">{generalStats.totalCharacters.toLocaleString()}</p>
                                <p className="dark:text-white">Caracteres leídos en total</p>
                            </div>
                            <div className="flex flex-col gap-2 bg-gray-100 dark:bg-opacity-20 p-4 rounded-md">
                                <p className="text-primary text-4xl font-bold">{formatTime(generalStats.totalTimeRead)}</p>
                                <p className="dark:text-white">{formatTimeText(generalStats.totalTimeRead)} en total</p>
                            </div>
                            <div className="flex flex-col gap-2 bg-gray-100 dark:bg-opacity-20 p-4 rounded-md">
                                <p className="text-primary text-4xl font-bold">{(generalStats.totalMangaBooks + generalStats.totalNovelaBooks).toLocaleString()}</p>
                                <p className="dark:text-white">Libros leídos</p>
                            </div>
                            <div className="flex flex-col gap-2 bg-gray-100 dark:bg-opacity-20 p-4 rounded-md">
                                <p className="text-primary text-4xl font-bold">{(generalStats.totalMangaSeries + generalStats.totalNovelaSeries).toLocaleString()}</p>
                                <p className="dark:text-white">Series leídas</p>
                            </div>
                        </div>
                    </div>
                    <CSSTransition classNames="extrainfo" timeout={300} in={details} unmountOnExit>
                        <div className="flex flex-wrap gap-4">
                            <div className="flex flex-col gap-2">
                                <h2 className="dark:text-white text-black">Estadísticas de manga</h2>
                                <div className="flex flex-wrap gap-4 items-center">
                                    <div className="flex flex-col gap-2 bg-gray-100 dark:bg-opacity-20 p-4 rounded-md">
                                        <p className="text-primary text-4xl font-bold">{generalStats.totalMangaBooks.toLocaleString()}</p>
                                        <p className="dark:text-white">Mangas leídos</p>
                                    </div>
                                    <div className="flex flex-col gap-2 bg-gray-100 dark:bg-opacity-20 p-4 rounded-md">
                                        <p className="text-primary text-4xl font-bold">{generalStats.totalMangaSeries.toLocaleString()}</p>
                                        <p className="dark:text-white">Series de manga leídas</p>
                                    </div>
                                    <div className="flex flex-col gap-2 bg-gray-100 dark:bg-opacity-20 p-4 rounded-md">
                                        <p className="text-primary text-4xl font-bold">{generalStats.totalPagesRead.toLocaleString()}</p>
                                        <p className="dark:text-white">Páginas de manga leídas</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <h2 className="dark:text-white text-black">Estadísticas de novelas</h2>
                                <div className="flex flex-wrap gap-4 items-center">
                                    <div className="flex flex-col gap-2 bg-gray-100 dark:bg-opacity-20 p-4 rounded-md">
                                        <p className="text-primary text-4xl font-bold">{generalStats?.totalNovelaBooks.toLocaleString()}</p>
                                        <p className="dark:text-white">Novelas leídas</p>
                                    </div>
                                    <div className="flex flex-col gap-2 bg-gray-100 dark:bg-opacity-20 p-4 rounded-md">
                                        <p className="text-primary text-4xl font-bold">{generalStats?.totalNovelaSeries.toLocaleString()}</p>
                                        <p className="dark:text-white">Series de novelas leídas</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CSSTransition>
                </div>
            )}
        </div>
    );
}

export default GeneralStats;