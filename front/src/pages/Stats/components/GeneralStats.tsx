import {useQuery} from "@tanstack/react-query";
import {useState} from "react";
import {api} from "../../../api/api";
import {keys} from "../../../lib/queryKeys";
import {ErrorState} from "../../../ui/ErrorState";
import {Skeleton} from "../../../ui/Skeleton";

interface GameStats {
    totalMangaBooks:number;
    totalNovelaBooks:number;
    totalMangaSeries:number;
    totalNovelaSeries:number;
    totalPagesRead:number;
    totalCharacters:number;
    totalTimeRead:number;
}

function formatTime(minutes?:number):string {
    if (!minutes) return "0";

    if (minutes < 60) {
        return minutes.toLocaleString(undefined, {maximumFractionDigits:1});
    }

    return (minutes / 60).toLocaleString(undefined, {maximumFractionDigits:1});
}

function formatTimeText(minutes?:number):string {
    if (!minutes || minutes < 60) return "Minutos leídos";
    return "Horas leídas";
}

interface StatCardProps {
    value: string;
    label: string;
}

function StatCard({value, label}:StatCardProps):React.ReactElement {
    return (
        <div className="flex min-w-40 flex-1 flex-col gap-1 rounded-xl border border-app-border bg-app-surface p-4">
            <p className="text-3xl font-bold text-primary">{value}</p>
            <p className="text-xs text-fg-muted">{label}</p>
        </div>
    );
}

function GeneralStats():React.ReactElement {
    const [details, setDetails] = useState(false);

    const {data:generalStats, isLoading, isError, refetch} = useQuery({
        queryKey:keys.stats,
        queryFn:async()=>{
            return api.get<GameStats>("readprogress/mystats");
        }
    });

    if (isLoading) {
        return (
            <section className="flex flex-wrap gap-4">
                {Array.from({length:4}, (_, index)=>(
                    <Skeleton key={index} className="h-24 min-w-40 flex-1 rounded-xl" />
                ))}
            </section>
        );
    }

    if (isError || !generalStats) {
        return <ErrorState title="No se pudieron cargar tus estadísticas" onRetry={()=>void refetch()} />;
    }

    return (
        <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold text-fg">Estadísticas generales</h2>
                <button
                    type="button"
                    className="text-xs font-medium text-primary hover:underline"
                    onClick={()=>setDetails((prev)=>!prev)}
                >
                    {details ? "Ocultar detalles" : "Ver detalles"}
                </button>
            </div>

            <div className="flex flex-wrap gap-4">
                <StatCard value={generalStats.totalCharacters.toLocaleString()} label="Caracteres leídos en total" />
                <StatCard value={formatTime(generalStats.totalTimeRead)} label={`${formatTimeText(generalStats.totalTimeRead)} en total`} />
                <StatCard value={(generalStats.totalMangaBooks + generalStats.totalNovelaBooks).toLocaleString()} label="Libros leídos" />
                <StatCard value={(generalStats.totalMangaSeries + generalStats.totalNovelaSeries).toLocaleString()} label="Series leídas" />
            </div>

            {details ? (
                <div className="flex flex-wrap gap-8 pt-2 animate-fade-in">
                    <div className="flex flex-col gap-3">
                        <h3 className="text-sm font-semibold text-fg-muted">Manga</h3>
                        <div className="flex flex-wrap gap-4">
                            <StatCard value={generalStats.totalMangaBooks.toLocaleString()} label="Mangas leídos" />
                            <StatCard value={generalStats.totalMangaSeries.toLocaleString()} label="Series de manga leídas" />
                            <StatCard value={generalStats.totalPagesRead.toLocaleString()} label="Páginas de manga leídas" />
                        </div>
                    </div>
                    <div className="flex flex-col gap-3">
                        <h3 className="text-sm font-semibold text-fg-muted">Novelas</h3>
                        <div className="flex flex-wrap gap-4">
                            <StatCard value={generalStats.totalNovelaBooks.toLocaleString()} label="Novelas leídas" />
                            <StatCard value={generalStats.totalNovelaSeries.toLocaleString()} label="Series de novelas leídas" />
                        </div>
                    </div>
                </div>
            ) : null}
        </section>
    );
}

export default GeneralStats;
