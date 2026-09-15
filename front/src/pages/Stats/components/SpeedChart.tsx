import {
    CategoryScale,
    Chart as ChartJS,
    type ChartData,
    type ChartOptions,
    Filler,
    Legend,
    LineElement,
    LinearScale,
    PointElement,
    Title,
    Tooltip,
} from "chart.js";
import {useMemo} from "react";
import {Line} from "react-chartjs-2";
import {useIsDarkMode} from "../../../lib/colorMode";
import {chartTokens} from "../../../lib/tokens";

ChartJS.register(LinearScale, CategoryScale, PointElement, LineElement, Title, Legend, Filler, Tooltip);

interface SpeedPoint {
    month:string;
    speed:number;
}

interface SpeedChartProps {
    data:{manga:SpeedPoint[], novelas:SpeedPoint[]};
    labels:string[];
}

function SpeedChart({data, labels}:SpeedChartProps):React.ReactElement {
    const isDark = useIsDarkMode();
    const tokens = chartTokens(isDark);

    const chartData = useMemo<ChartData<"line">>(()=>({
        labels:labels.length === 1 ? labels.concat(labels) : labels,
        datasets: [
            {
                label: "Manga",
                data:data.manga.map((item)=>item.speed),
                borderColor: tokens.primary,
                backgroundColor: `${tokens.primary}26`,
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 3,
                pointBackgroundColor: isDark ? "#1E1E1E" : "#ffffff",
                pointHoverRadius: 7,
                pointHoverBackgroundColor: isDark ? "#1E1E1E" : "#ffffff",
            },
            {
                label: "Novela",
                data:data.novelas.map((item)=>item.speed),
                borderColor: tokens.accent,
                backgroundColor: `${tokens.accent}26`,
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 3,
                pointBackgroundColor: isDark ? "#1E1E1E" : "#ffffff",
                pointHoverRadius: 7,
                pointHoverBackgroundColor: isDark ? "#1E1E1E" : "#ffffff",
            },
        ],
    }), [data, labels, tokens.primary, tokens.accent, isDark]);

    const options = useMemo<ChartOptions<"line">>(()=>({
        maintainAspectRatio: false,
        color: tokens.fg,
        scales: {
            y: {
                beginAtZero: true,
                grace: "10%",
                ticks: {color: tokens.fgMuted},
                grid: {color: tokens.border},
                title: {display: true, text: "Vel (chars/h)", color: tokens.fgMuted},
            },
            x: {
                ticks: {color: tokens.fgMuted},
                grid: {display: false},
            },
        },
        plugins: {
            legend: {labels: {color: tokens.fg, boxWidth: 12}},
            tooltip: {mode: "index", intersect: false},
        },
    }), [tokens.fg, tokens.fgMuted, tokens.border]);

    return <Line data={chartData} options={options} />;
}

export default SpeedChart;
