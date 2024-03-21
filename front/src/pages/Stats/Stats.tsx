import React from "react";
import SpeedChart from "./components/SpeedChart";
import TotalReadChart from "./components/TotalReadChart";
import GeneralStats from "./components/GeneralStats";
import {useAuth} from "../../contexts/AuthContext";
import {useQuery} from "react-query";
import {api} from "../../api/api";
import {Helmet} from "react-helmet";

function Stats():React.ReactElement {
    const {userData} = useAuth();

    const {data = {speedGraph:[], hoursGraph:[]}} = useQuery("mygraphs", async()=>{
        const res = await api.get<{_id:{month:number, year:number}, totalHours:number, meanReadSpeed:number}[]>("readprogress/mygraphs");

        if (res) {
            const hoursGraph = res.map((x)=>{
                return {month:`${x._id.month}-${x._id.year}`, totalHours:Math.floor(x.totalHours)};
            }).filter((x)=>x.totalHours > 0);
            let speedGraph = res.map((x)=>{
                return {month:`${x._id.month}-${x._id.year}`, speed:Math.floor(x.meanReadSpeed)};
            }).filter((x)=>x.speed > 0);

            if (speedGraph.length === 1) {
                speedGraph = speedGraph.concat(speedGraph);
            }
            return {hoursGraph:hoursGraph, speedGraph:speedGraph};
        }
    });

    return (
        <div className="flex flex-col w-full dark:bg-[#121212] gap-8 py-8 overflow-x-hidden h-fill">
            <Helmet>
                <title>YomiYasu - Estadísticas</title>
            </Helmet>
            <div className="flex flex-col w-3/4 mx-auto gap-8 items-start">
                <h1 className="dark:text-white">Estadísticas de {userData?.username}</h1>
                <GeneralStats/>
            </div>
            <div className="flex flex-col w-3/4 mx-auto bg-gray-100 dark:bg-opacity-20 p-8 rounded-lg gap-4">
                <h2 className="dark:text-white">Velocidad con el tiempo</h2>
                <div className="h-80">
                    <SpeedChart data={data.speedGraph}/>
                </div>
            </div>
            <div className="flex flex-col w-3/4 mx-auto bg-gray-100 dark:bg-opacity-20 p-8 rounded-lg gap-4">
                <h2 className="dark:text-white">Horas leídas por mes</h2>
                <div className="h-80">
                    <TotalReadChart data={data.hoursGraph}/>
                </div>
            </div>
        </div>
    );
}

export default Stats;