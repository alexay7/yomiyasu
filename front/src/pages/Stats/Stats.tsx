import React from "react";
import SpeedChart from "./components/SpeedChart";
import TotalReadChart from "./components/TotalReadChart";
import GeneralStats from "./components/GeneralStats";
import {useAuth} from "../../contexts/AuthContext";
import {useQuery} from "react-query";
import {api} from "../../api/api";

function Stats():React.ReactElement {
    const {userData} = useAuth();

    const {data = {speedGraph:[], hoursGraph:[]}} = useQuery("mygraphs", async()=>{
        const res = await api.get<{_id:{month:number, year:number}, totalHours:number, meanReadSpeed:number}[]>("readprogress/mygraphs");

        if (res) {
            const hoursGraph = res.map((x)=>{
                return {month:`${x._id.month}-${x._id.year}`, totalHours:Math.floor(x.totalHours)};
            });
            let graphData = res;
            if (graphData.length === 1) {
                graphData = graphData.concat(res);
            }
            const speedGraph = graphData.map((x)=>{
                return {month:`${x._id.month}-${x._id.year}`, speed:Math.floor(x.meanReadSpeed)};
            });
            return {hoursGraph, speedGraph};
        }
    });

    return (
        <div className="flex flex-col w-full dark:bg-[#121212] gap-8 py-8">
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