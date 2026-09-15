import dayjs, {type Dayjs} from "../../../lib/dayjs";
import {useMemo, useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {api} from "../../../api/api";
import {keys} from "../../../lib/queryKeys";
import {useTitle} from "../../../lib/useTitle";
import {Spinner} from "../../../ui/Spinner";
import type {UserProgress} from "../../../types/user";
import {HeatmapCalendar} from "../components/HeatmapCalendar";
import {LogTable, type LogData} from "../components/LogTable";

function Calendar():React.ReactElement {
    const [selectedDay, setSelectedDay] = useState<Dayjs>(dayjs());
    const [month, setMonth] = useState<Dayjs>(dayjs());

    useTitle("Calendario");

    const {data:streakData = []} = useQuery({
        queryKey:keys.streak(month.year(), month.month()),
        queryFn:async()=>{
            const res = await api.get<{dayOfMonth:number, count:number}[]>(`readprogress/streak/${month.year()}/${month.month()}`);
            return res ?? [];
        }
    });

    const {max, total} = useMemo(()=>{
        let highest = 0;
        let sum = 0;

        streakData.forEach((day)=>{
            sum += day.count;
            if (highest < day.count) {
                highest = day.count;
            }
        });

        return {max:highest, total:sum};
    }, [streakData]);

    const {data:progressData = [], refetch, isLoading, isSuccess} = useQuery({
        queryKey:keys.dayLogs(selectedDay.year(), selectedDay.month() + 1, selectedDay.date()),
        queryFn:async()=>{
            const res = await api.get<UserProgress[]>(`readprogress/logs/${selectedDay.year()}/${selectedDay.month() + 1}/${selectedDay.date()}`);

            if (!res || res.length === 0) return [];

            const rows:LogData[] = [];

            res.forEach((progress)=>{
                let thumbnail = progress.variant === "manga" ? `/mangas/${progress.bookInfo.seriePath}/${progress.bookInfo.imagesFolder}/${progress.bookInfo.thumbnailPath}` : `/novelas/${progress.bookInfo.seriePath}/${progress.bookInfo.thumbnailPath}`;

                if (progress.bookInfo.mokured) {
                    thumbnail = `/novelas/${progress.bookInfo.seriePath}/${progress.bookInfo.imagesFolder}/${progress.bookInfo.thumbnailPath}`;
                }

                rows.push({
                    id:progress._id,
                    bookId:progress.bookInfo._id,
                    image:`/api/static/${thumbnail}`,
                    book:progress.bookInfo.visibleName,
                    serie:progress.serieInfo.visibleName,
                    tipo:progress.variant,
                    status:progress.status,
                    currentPage:progress.currentPage,
                    startDate:progress.startDate,
                    endDate:progress.endDate,
                    time:progress.time,
                    lastUpdateDate:progress.lastUpdateDate,
                    characters:progress.bookInfo.pageChars && progress.bookInfo.pageChars.length >=
                        progress.currentPage ? progress.bookInfo.pageChars[progress.currentPage - 1] : 0
                });
            });

            return rows;
        }
    });

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 lg:px-8">
            <header className="flex flex-col gap-1">
                <h1 className="text-xl font-bold text-fg">Calendario de lectura</h1>
                <p className="text-sm text-fg-muted">{total} registros este mes</p>
            </header>

            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                <div className="shrink-0 lg:w-[24rem]">
                    <HeatmapCalendar
                        month={month}
                        onMonthChange={(next)=>{
                            setMonth(next);
                            setSelectedDay(next);
                        }}
                        streak={streakData}
                        max={max}
                        selectedDay={selectedDay}
                        onSelectDay={setSelectedDay}
                    />
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-4">
                    <h2 className="text-sm font-semibold text-fg">
                        Logs del {selectedDay.toDate().toLocaleDateString("es", {year:"numeric", month:"long", day:"numeric"})}
                    </h2>

                    {isLoading ? (
                        <div className="flex justify-center py-10">
                            <Spinner size={22} className="text-fg-muted" />
                        </div>
                    ) : (
                        <LogTable
                            data={progressData}
                            loading={!isSuccess}
                            refetch={()=>void refetch()}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

export default Calendar;
