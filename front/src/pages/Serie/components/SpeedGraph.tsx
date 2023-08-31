import React, {useEffect} from "react";
import {useQuery} from "react-query";
import {api} from "../../../api/api";
import {Line} from "react-chartjs-2";
import {Chart as ChartJS, ChartData, Point, LinearScale, CategoryScale, PointElement, LineElement, Title, Legend, Filler, Tooltip} from "chart.js";
import {useTheme} from "@mui/material";
import {Book} from "../../../types/book";
import {useGlobal} from "../../../contexts/GlobalContext";

ChartJS.register(LinearScale, CategoryScale, PointElement, LineElement, Title, Legend, Filler, Tooltip);

interface SpeedGraphProps {
    serieId:string,
    books:Book[]
}

function SpeedGraph(props:SpeedGraphProps):React.ReactElement {
    const {serieId, books} = props;
    const {reloaded} = useGlobal();

    const {data:serieSpeed = [], refetch} = useQuery(`serie-${serieId}-speed`, async()=>{
        const response = await api.get<{book:string, meanReadSpeed:number, startDate:string}[]>(`readprogress/serie/${serieId}/speed`);
        return response;
    });

    useEffect(()=>{
        if (reloaded === "all") {
            void refetch();
        }
    }, [reloaded, refetch]);

    const theme = useTheme();

    const chartData:ChartData<"line", (number | Point | null)[], unknown> = {
        labels: serieSpeed.map((item) => `${books.find((x)=>x._id === item.book)?.visibleName} - ${new Date(item.startDate).toLocaleDateString("es")}`),
        datasets: [
            {
                label: "Velocidad",
                data: serieSpeed.map((item) => item.meanReadSpeed),
                fill: true,
                borderColor: "#24B14D",
                backgroundColor: "#24b14c39",
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: "white",
                pointHoverRadius: 8,
                pointHoverBackgroundColor: "white"
            }
        ]
    };

    function calculateSpeed():string {
        if (!serieSpeed || serieSpeed.length === 0) return "";
        const difference = Math.round((serieSpeed[serieSpeed.length - 1].meanReadSpeed - serieSpeed[0].meanReadSpeed) /
        serieSpeed[0].meanReadSpeed * 100);
        if (difference > 0) {
            return `ha aumentado un ${difference}%`;
        }
        return `ha disminuido un ${difference * -1}%`;
    }

    const chartOptions  = {
        scales: {
            y: {
                ticks: {
                    color: theme.palette.mode === "dark" ? "white" : "black"
                },
                beginAtZero: true,
                title: {
                    display: true,
                    text: "Vel (chars/h)",
                    color:theme.palette.mode === "dark" ? "white" : "black"
                },
                grace:"10%"
            },
            x: {
                display:false
            }
        },
        elements:{
            line:{
                tension:0.4
            }
        },
        showToolTips:true,
        color:theme.palette.mode === "dark" ? "white" : "black",
        maintainAspectRatio: false
    };

    return (
        <div className="h-52 flex flex-col gap-2">
            {serieSpeed && serieSpeed.length > 0 && (
                <p className="text-xs">Tu velocidad <span className="text-primary font-semibold">{calculateSpeed()}</span> desde que empezaste esta serie</p>
            )}
            <Line data={chartData} options={{...chartOptions, plugins:{tooltip:{mode:"index", intersect:false}}}} />
        </div>
    );
}

export default SpeedGraph;