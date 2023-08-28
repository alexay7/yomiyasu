import React from "react";

import {Bar} from "react-chartjs-2";
import {Chart as ChartJS, LinearScale, CategoryScale, PointElement, LineElement, BarElement, Title, Filler, ChartData, Point} from "chart.js";
import {useTheme} from "@mui/material";

ChartJS.register(LinearScale, CategoryScale, PointElement, LineElement, BarElement, Title, Filler);

interface DataPoint {
    month: string;
    totalHours: number;
}


interface HoursProps {
    data:DataPoint[]
}

function TotalReadChart(props:HoursProps):React.ReactElement {
    const {data} = props;
    const theme = useTheme();

    const chartData:ChartData<"bar", (number | Point | null)[], unknown> = {
        labels: data.map((item) => item.month),
        datasets: [
            {
                label: "Horas leídas por mes",
                data: data.map((item) => item.totalHours),
                borderColor: "#24B14D",
                backgroundColor: "#24b14c39",
                borderWidth: 2
            }
        ]
    };

    const chartOptions  = {
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: "Horas totales",
                    color:theme.palette.mode === "dark" ? "white" : "black"
                },
                grace:"10%",
                ticks: {
                    color: theme.palette.mode === "dark" ? "white" : "black"
                }
            },
            x: {
                title: {
                    display: true,
                    text: "Meses",
                    color:theme.palette.mode === "dark" ? "white" : "black"
                },
                ticks: {
                    color: theme.palette.mode === "dark" ? "white" : "black"
                }
            }
        },
        elements:{
            line:{
                tension:0.4
            }
        },
        color:theme.palette.mode === "dark" ? "white" : "black",
        maintainAspectRatio: false
    };

    return <Bar data={chartData} options={{...chartOptions, plugins:{tooltip:{mode:"index", intersect:false}}}} />;
}

export default TotalReadChart;