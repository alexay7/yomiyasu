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

    // Solo las lecturas terminadas entran en la gráfica y en el cálculo: los
    // documentos en curso (sin endDate) nacen con caracteres acumulados y poco
    // tiempo, lo que dispara velocidades irreales y porcentajes absurdos.
    const completedSpeed = serieSpeed.filter((x)=>x.endDate !== undefined && x.endDate !== null);

    const chartData:ChartData<"line", (number | Point | null)[], unknown> = {
        labels: completedSpeed.map((item) => `${books.find((x)=>x._id === item.book)?.visibleName} - ${new Date(item.endDate).toLocaleDateString("es")}`),
        datasets: [
            {
                label: "Velocidad",
                data: completedSpeed.map((item) => item.meanReadSpeed),
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
        if (completedSpeed.length < 2) return "";
        const firstSpeed = completedSpeed[0].meanReadSpeed;
        const lastSpeed = completedSpeed[completedSpeed.length - 1].meanReadSpeed;
        if (!firstSpeed || !lastSpeed) return "";
        const difference = Math.round((lastSpeed - firstSpeed) / firstSpeed * 100);
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

    const speedText = calculateSpeed();

    return (
        <div className="h-52 flex flex-col gap-2">
            {serieSpeed && serieSpeed.length > 0 && (
                <p className="text-xs">
                    {speedText ? <>Tu velocidad <span className="text-primary font-semibold">{speedText}</span> desde que empezaste esta serie. </> : null}
                    Has pasado {formatTime(calculateTime())} leyendo esta serie.
                </p>
            )}
            <Line data={chartData} options={{...chartOptions, plugins:{tooltip:{mode:"index", intersect:false}}}} />
        </div>
    );
}

export default SpeedGraph;