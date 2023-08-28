import React from "react";
import {useQuery} from "react-query";
import {api} from "../../../api/api";

function GeneralStats():React.ReactElement {
    const {data:generalStats} = useQuery("mystats", async()=>{
        return api.get<{totalBooks:number, totalSeries:number, totalPagesRead:number, totalCharacters:number, totalTimeRead:number}>("readprogress/mystats");
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
            return "minutos leídos";
        }
        // Minutos
        if (minutes < 60) {
            return "minutos leídos";
        }

        return "horas leídas";
    }

    return (
        <div className="flex flex-wrap gap-4 w-full items-center">
            <div className="flex flex-col gap-2 bg-gray-100 dark:bg-opacity-20 p-4 rounded-md">
                <p className="text-primary text-4xl font-bold">{generalStats?.totalBooks.toLocaleString()}</p>
                <p className="dark:text-white">Volúmenes leídos</p>
            </div>
            <div className="flex flex-col gap-2 bg-gray-100 dark:bg-opacity-20 p-4 rounded-md">
                <p className="text-primary text-4xl font-bold">{generalStats?.totalSeries.toLocaleString()}</p>
                <p className="dark:text-white">Series leídas</p>
            </div>
            <div className="flex flex-col gap-2 bg-gray-100 dark:bg-opacity-20 p-4 rounded-md">
                <p className="text-primary text-4xl font-bold">{generalStats?.totalCharacters.toLocaleString()}</p>
                <p className="dark:text-white">Caracteres leídos</p>
            </div>
            <div className="flex flex-col gap-2 bg-gray-100 dark:bg-opacity-20 p-4 rounded-md">
                <p className="text-primary text-4xl font-bold">{generalStats?.totalPagesRead.toLocaleString()}</p>
                <p className="dark:text-white">Páginas leídas</p>
            </div>
            <div className="flex flex-col gap-2 bg-gray-100 dark:bg-opacity-20 p-4 rounded-md">
                <p className="text-primary text-4xl font-bold">{formatTime(generalStats?.totalTimeRead)}</p>
                <p className="dark:text-white">{formatTimeText(generalStats?.totalTimeRead)}</p>
            </div>
        </div>
    );
}

export default GeneralStats;