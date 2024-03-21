import React from "react";

import {Line} from "react-chartjs-2";
import {Chart as ChartJS, LinearScale, CategoryScale, PointElement, LineElement, Title, Legend, Filler, ChartData, Point, Tooltip} from "chart.js";
import {useTheme} from "@mui/material";

ChartJS.register(LinearScale, CategoryScale, PointElement, LineElement, Title, Legend, Filler, Tooltip);

interface DataPoint {
    month: string;
    speed: number;
}

interface SpeedProps {
    data:DataPoint[]
}

function SpeedChart(props:SpeedProps):React.ReactElement {
    const {data} = props;
    const theme = useTheme();

    const style = getComputedStyle(document.body);
    const primCol = `${style.getPropertyValue("--primary-color")}39`;
    const accCol = style.getPropertyValue("--primary-color");

    const chartData:ChartData<"line", (number | Point | null)[], unknown> = {
        labels: data.map((item) => item.month),
        datasets: [
            {
                label: "Velocidad en el tiempo",
                data: data.map((item) => item.speed),
                fill: true,
                borderColor: accCol,
                backgroundColor: primCol,
                borderWidth: 3,
                pointRadius: 4,
                pointBackgroundColor: "white",
                pointHoverRadius: 8,
                pointHoverBackgroundColor: "white"
            }
        ]
    };

    const chartOptions  = {
        scales: {
            y: {
                ticks: {
                    color: theme.palette.mode === "dark" ? "white" : "black"
                },
                beginAtZero: true,
                title: {
                    display: true,
                    text: "Velocidad (caracteres/hora)",
                    color:theme.palette.mode === "dark" ? "white" : "black"
                },
                grace:"10%"
            },
            x: {
                ticks: {
                    color: theme.palette.mode === "dark" ? "white" : "black"
                },
                title: {
                    display: true,
                    text: "Meses",
                    color:theme.palette.mode === "dark" ? "white" : "black"
                }
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

    return <Line data={chartData} options={{...chartOptions, plugins:{tooltip:{mode:"index", intersect:false}}}} />;
}

export default SpeedChart;