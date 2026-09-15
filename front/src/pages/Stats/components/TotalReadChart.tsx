import {
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    type ChartData,
    type ChartOptions,
    Filler,
    Legend,
    LinearScale,
    Title,
    Tooltip,
} from "chart.js";
import {useMemo} from "react";
import {Bar} from "react-chartjs-2";
import {useIsDarkMode} from "../../../lib/colorMode";
import {chartTokens} from "../../../lib/tokens";

ChartJS.register(LinearScale, CategoryScale, BarElement, Title, Legend, Filler, Tooltip);

interface HoursPoint {
    month:string;
    totalHours:number;
}

interface TotalReadChartProps {
    data:{manga:HoursPoint[], novelas:HoursPoint[]};
    labels:string[];
}

function TotalReadChart({data, labels}:TotalReadChartProps):React.ReactElement {
    const isDark = useIsDarkMode();
    const tokens = chartTokens(isDark);

    const chartData = useMemo<ChartData<"bar">>(()=>({
        labels:labels.length === 1 ? labels.concat(labels) : labels,
        datasets: [
            {
                label: "Manga",
                data:data.manga.map((item)=>item.totalHours),
                backgroundColor: tokens.primary,
                borderRadius: 4,
                stack: "horas",
            },
            {
                label: "Novela",
                data:data.novelas.map((item)=>item.totalHours),
                backgroundColor: tokens.accent,
                borderRadius: 4,
                stack: "horas",
            },
        ],
    }), [data, labels, tokens.primary, tokens.accent]);

    const options = useMemo<ChartOptions<"bar">>(()=>({
        maintainAspectRatio: false,
        color: tokens.fg,
        scales: {
            x: {
                stacked: true,
                ticks: {color: tokens.fgMuted},
                grid: {display: false},
            },
            y: {
                stacked: true,
                beginAtZero: true,
                ticks: {color: tokens.fgMuted},
                grid: {color: tokens.border},
                title: {display: true, text: "Horas", color: tokens.fgMuted},
            },
        },
        plugins: {
            legend: {labels: {color: tokens.fg, boxWidth: 12}},
            tooltip: {mode: "index", intersect: false},
        },
    }), [tokens.fg, tokens.fgMuted, tokens.border]);

    return <Bar data={chartData} options={options} />;
}

export default TotalReadChart;
