import React from "react";
import SpeedChart from "./components/SpeedChart";
import TotalReadChart from "./components/TotalReadChart";
import GeneralStats from "./components/GeneralStats";
import {useAuth} from "../../contexts/AuthContext";
import {useQuery} from "react-query";
import {api} from "../../api/api";
import {Helmet} from "react-helmet";

interface MonthPoint {
    _id:{month:number, year:number}, totalHours:number, meanReadSpeed:number
}

function Stats():React.ReactElement {
    const {userData} = useAuth();

    const {data = {speedData:{
        manga:[],
        novelas:[]
    }, hoursData:{
        manga:[],
        novelas:[]
    }, labels:[]}} = useQuery("mygraphs", async()=>{
        const res = await api.get<{manga:MonthPoint[], novela:MonthPoint[]}>("readprogress/mygraphs");

        if (res) {
        // Get speed data from manga and novelas so that inside of the object we have novelas with the speed and manga with the speed
            const speedData = {
                manga:res.manga.map((item)=>({month:`${item._id.month}/${item._id.year}`, speed:item.meanReadSpeed})),
                novelas:res.novela.map((item)=>({month:`${item._id.month}/${item._id.year}`, speed:item.meanReadSpeed}))
            };

            const hoursData = {
                manga:res.manga.map((item)=>({month:`${item._id.month}/${item._id.year}`, totalHours:item.totalHours})),
                novelas:res.novela.map((item)=>({month:`${item._id.month}/${item._id.year}`, totalHours:item.totalHours}))
            };

            if (speedData.manga.length === 1) {
                speedData.manga = speedData.manga.concat(speedData.manga);
            }

            if (speedData.novelas.length === 1) {
                speedData.novelas = speedData.novelas.concat(speedData.novelas);
            }

            // Get labels from both res.manga and res.novelas without duplicates
            const labels = res.manga.map((item)=>`${item._id.month}/${item._id.year}`).concat(res.novela.map((item)=>`${item._id.month}/${item._id.year}`)).filter((value, index, self)=>self.indexOf(value) === index);

            // Fill the gaps in the data with the previous value in speedData or 0 if it's the first label
            labels.forEach((label, index)=>{
                if (!hoursData.manga.find((item)=>item.month === label)) {
                    hoursData.manga.splice(index, 0, {month:label, totalHours:0});
                }

                if (!hoursData.novelas.find((item)=>item.month === label)) {
                    hoursData.novelas.splice(index, 0, {month:label, totalHours:0});
                }

                if (!speedData.manga.find((item)=>item.month === label)) {
                    speedData.manga.splice(index, 0, {month:label, speed:speedData.manga[index - 1]?.speed || 0});
                }

                if (!speedData.novelas.find((item)=>item.month === label)) {
                    speedData.novelas.splice(index, 0, {month:label, speed:speedData.novelas[index - 1]?.speed || 0});
                }
            });

            return {speedData, hoursData, labels};
        }
    });

    return (
        <div className="flex flex-col w-full dark:bg-[#121212] overflow-y-scroll h-[calc(100svh-4rem)]">
            <Helmet>
                <title>YomiYasu - Estadísticas</title>
            </Helmet>
            <div className="flex flex-col py-8 gap-8">
                <div className="flex flex-col w-3/4 mx-auto gap-8 items-start">
                    <h1 className="dark:text-white">Estadísticas de {userData?.username}</h1>
                    <GeneralStats/>
                </div>
                <div className="flex flex-col w-3/4 mx-auto bg-gray-100 dark:bg-opacity-20 p-8 rounded-lg gap-4">
                    <h2 className="dark:text-white">Velocidad con el tiempo</h2>
                    <div className="h-80">
                        <SpeedChart data={data.speedData} labels={data.labels}/>
                    </div>
                </div>
                <div className="flex flex-col w-3/4 mx-auto bg-gray-100 dark:bg-opacity-20 p-8 rounded-lg gap-4">
                    <h2 className="dark:text-white">Horas leídas por mes</h2>
                    <div className="h-80">
                        <TotalReadChart data={data.hoursData} labels={data.labels}/>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Stats;