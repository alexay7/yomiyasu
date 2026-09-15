import React from "react";
import {useQuery} from "@tanstack/react-query";
import {api} from "../../../api/api";
import {Line} from "react-chartjs-2";
import {Chart as ChartJS, ChartData, Point, LinearScale, CategoryScale, PointElement, LineElement, Title, Legend, Filler, Tooltip} from "chart.js";
import {Book} from "../../../types/book";
import {formatTime} from "../../../helpers/helpers";
import {keys} from "../../../lib/queryKeys";
import {useIsDarkMode} from "../../../lib/colorMode";
import {chartTokens} from "../../../lib/tokens";

ChartJS.register(LinearScale, CategoryScale, PointElement, LineElement, Title, Legend, Filler, Tooltip);

interface SpeedGraphProps {
    serieId:string,
    books:Book[]
}

function SpeedGraph(props:SpeedGraphProps):React.ReactElement {
    const {serieId, books} = props;

    const {data:serieSpeed = []} = useQuery({
        queryKey:keys.serieSpeed(serieId),
        queryFn:async()=>{
            const response = await api.get<{book:string, meanReadSpeed:number, endDate:string, time:number}[]>(`readprogress/serie/${serieId}/speed`);
            return response;
        }
    });

    const isDark = useIsDarkMode();
    const tokens = chartTokens(isDark);

    const chartData:ChartData<"line", (number | Point | null)[], unknown> = {
        labels: serieSpeed.filter((x)=>x.endDate !== undefined && x.endDate !== null).map((item) => `${books.find((x)=>x._id === item.book)?.visibleName} - ${new Date(item.endDate).toLocaleDateString("es")}`),
        datasets: [
            {
                label: "Velocidad",
                data: serieSpeed.filter((x)=>x.endDate !== undefined && x.endDate !== null).map((item) => item.meanReadSpeed),
                fill: true,
                borderColor: tokens.primary,
                backgroundColor: `${tokens.primary}26`,
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: isDark ? "#1E1E1E" : "#ffffff",
                pointHoverRadius: 8,
                pointHoverBackgroundColor: isDark ? "#1E1E1E" : "#ffffff"
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

    function calculateTime():number {
        let totalTime = 0;
        serieSpeed.forEach((x)=>{
            totalTime += x.time;
        });
        return totalTime;
    }

    const chartOptions  = {
        scales: {
            y: {
                ticks: {
                    color: tokens.fg
                },
                beginAtZero: true,
                title: {
                    display: true,
                    text: "Vel (chars/h)",
                    color:tokens.fg
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
        color:tokens.fg,
        maintainAspectRatio: false
    };

    return (
        <div className="h-52 flex flex-col gap-2">
            {serieSpeed && serieSpeed.length > 0 && (
                <p className="text-xs">Tu velocidad <span className="text-primary font-semibold">{calculateSpeed()}</span> desde que empezaste esta serie. Has pasado {formatTime(calculateTime())} leyendo esta serie.</p>
            )}
            <Line data={chartData} options={{...chartOptions, plugins:{tooltip:{mode:"index", intersect:false}}}} />
        </div>
    );
}

export default SpeedGraph;