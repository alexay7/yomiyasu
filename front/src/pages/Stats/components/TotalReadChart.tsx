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
    data:{
        manga:DataPoint[];
        novelas:DataPoint[];
    },
    labels?:string[];
}

function TotalReadChart(props:HoursProps):React.ReactElement {
    const {data, labels} = props;
    const theme = useTheme();

    const style = getComputedStyle(document.body);
    const primCol = `${style.getPropertyValue("--primary-color")}39`;
    const accCol = style.getPropertyValue("--primary-color");
    const secCol = `${style.getPropertyValue("--accent-color")}39`;
    const secAccCol = style.getPropertyValue("--accent-color");

    const chartData:ChartData<"bar", (number | Point | null)[], unknown> = {
        labels: labels,
        datasets: [
            {
                label: "Manga",
                data: data.manga.map((item) => item.totalHours),
                borderColor: accCol,
                backgroundColor: primCol,
                borderWidth: 3
            },
            {
                label: "Novelas",
                data: data.novelas.map((item) => item.totalHours),
                borderColor: secAccCol,
                backgroundColor: secCol,
                borderWidth: 3
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
                },
                stacked:true
            },
            x: {
                title: {
                    display: true,
                    text: "Meses",
                    color:theme.palette.mode === "dark" ? "white" : "black"
                },
                ticks: {
                    color: theme.palette.mode === "dark" ? "white" : "black"
                },
                stacked:true
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