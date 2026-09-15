import {useMemo} from "react";
import {useQuery} from "@tanstack/react-query";
import {api} from "../../api/api";
import {useAuth} from "../../contexts/AuthContext";
import {keys} from "../../lib/queryKeys";
import {useTitle} from "../../lib/useTitle";
import {ErrorState} from "../../ui/ErrorState";
import {Skeleton} from "../../ui/Skeleton";
import GeneralStats from "./components/GeneralStats";
import SpeedChart from "./components/SpeedChart";
import TotalReadChart from "./components/TotalReadChart";

interface MonthPoint {
    _id:{month:number, year:number}, totalHours:number, meanReadSpeed:number
}

function Stats():React.ReactElement {
    const {userData} = useAuth();

    useTitle("Estadísticas");

    const {data, isLoading, isError, refetch} = useQuery({
        queryKey:keys.graphs,
        queryFn:async()=>{
            const res = await api.get<{manga:MonthPoint[], novela:MonthPoint[]}>("readprogress/mygraphs");

            if (!res) return {speedData:{manga:[], novelas:[]}, hoursData:{manga:[], novelas:[]}, labels:[]};

            const speedData = {
                manga:res.manga.map((item)=>({month:`${item._id.month}/${item._id.year}`, speed:item.meanReadSpeed})),
                novelas:res.novela.map((item)=>({month:`${item._id.month}/${item._id.year}`, speed:item.meanReadSpeed}))
            };

            const hoursData = {
                manga:res.manga.map((item)=>({month:`${item._id.month}/${item._id.year}`, totalHours:item.totalHours})),
                novelas:res.novela.map((item)=>({month:`${item._id.month}/${item._id.year}`, totalHours:item.totalHours}))
            };

            // Con un único punto, duplicarlo para que la gráfica dibuje una línea
            if (speedData.manga.length === 1) speedData.manga = speedData.manga.concat(speedData.manga);
            if (speedData.novelas.length === 1) speedData.novelas = speedData.novelas.concat(speedData.novelas);

            const labels = res.manga.map((item)=>`${item._id.month}/${item._id.year}`)
                .concat(res.novela.map((item)=>`${item._id.month}/${item._id.year}`))
                .filter((value, index, self)=>self.indexOf(value) === index);

            // Rellenar huecos: horas a 0 y velocidad con el valor anterior
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

    const charts = useMemo(()=>data ?? {speedData:{manga:[], novelas:[]}, hoursData:{manga:[], novelas:[]}, labels:[]}, [data]);

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 lg:px-8">
            <h1 className="text-xl font-bold text-fg">Estadísticas de {userData?.username}</h1>

            <GeneralStats />

            <section className="flex flex-col gap-4 rounded-xl border border-app-border bg-app-surface p-5 lg:p-6">
                <h2 className="text-base font-semibold text-fg">Velocidad con el tiempo</h2>
                <div className="h-72 lg:h-80">
                    {isLoading ? (
                        <Skeleton className="h-full w-full rounded-lg" />
                    ) : isError ? (
                        <ErrorState title="No se pudieron cargar las gráficas" onRetry={()=>void refetch()} />
                    ) : (
                        <SpeedChart data={charts.speedData} labels={charts.labels} />
                    )}
                </div>
            </section>

            <section className="flex flex-col gap-4 rounded-xl border border-app-border bg-app-surface p-5 lg:p-6">
                <h2 className="text-base font-semibold text-fg">Horas leídas por mes</h2>
                <div className="h-72 lg:h-80">
                    {isLoading ? (
                        <Skeleton className="h-full w-full rounded-lg" />
                    ) : isError ? (
                        <ErrorState title="No se pudieron cargar las gráficas" onRetry={()=>void refetch()} />
                    ) : (
                        <TotalReadChart data={charts.hoursData} labels={charts.labels} />
                    )}
                </div>
            </section>
        </div>
    );
}

export default Stats;
