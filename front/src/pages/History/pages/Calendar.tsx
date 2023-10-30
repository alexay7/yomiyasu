import {useTheme} from "@mui/material";
import {DateCalendar, PickersDay, PickersDayProps} from "@mui/x-date-pickers";
import dayjs, {Dayjs} from "dayjs";
import React, {useState} from "react";
import {useQuery} from "react-query";
import {api} from "../../../api/api";
import LogGrid, {LogData} from "../components/LogGrid";
import {UserProgress} from "../../../types/user";
import {Helmet} from "react-helmet";
import {twMerge} from "tailwind-merge";

function Calendar():React.ReactElement {
    const theme = useTheme();
    const [selectedDay, setSelectedDay] = useState<Dayjs | null>(dayjs());
    const [selectedStreak, setSelectedStreak] = useState<{month:number, year:number}>({month:dayjs().month(), year:dayjs().year()});
    const [max, setMax] = useState(0);
    const [total, setTotal] = useState(0);

    const {data:streakData = []} = useQuery(`${selectedStreak.year}-${selectedStreak.month}-streak`, async()=>{
        if (!selectedStreak) return [];
        const res = await api.get<{dayOfMonth:number, count:number}[]>(`readprogress/streak/${selectedStreak.year}/${selectedStreak.month}`);

        if (!res || res.length === 0) {
            setMax(0);
            setTotal(0);
            return [];
        }

        let highest = 0;
        let totAux = 0;

        res.forEach((el)=>{
            totAux += el.count;
            if (highest < el.count) {
                highest = el.count;
            }
        });

        setMax(highest);
        setTotal(totAux);

        return res;
    });

    function badgeDay(props:PickersDayProps<Dayjs> & {inmersed?:{dayOfMonth:number, count:number}[]}):React.ReactElement {
        const {inmersed = [], day, outsideCurrentMonth, ...other} = props;

        const [element] = inmersed.filter((x)=>x.dayOfMonth === props.day.date());

        if (!element) {
            return <PickersDay {...other} outsideCurrentMonth={outsideCurrentMonth} day={day} />;
        }

        const isSelected = !props.outsideCurrentMonth && inmersed.some((result) => result.dayOfMonth === props.day.date());

        const percentage = element.count / max;

        return (
            <div className={twMerge("rounded-full")} style={{backgroundColor:isSelected ? `rgba(36,177,77,${percentage})` : ""}}>
                <PickersDay {...other} outsideCurrentMonth={outsideCurrentMonth} day={day} />
            </div>
        );
    }

    const {data:progressData = [], refetch:refetchProgress} = useQuery(["progresses", selectedDay], async()=>{
        if (!selectedDay) return [];
        const res = await api.get<UserProgress[]>(`readprogress/logs/${selectedDay.year()}/${selectedDay.month() + 1}/${selectedDay.date()}`);

        if (!res || res.length === 0) return [];

        const rows:LogData[] = [];

        res.forEach((progress)=>{
            rows.push({
                id:progress._id,
                bookId:progress.bookInfo._id,
                image:`/api/static/${progress.bookInfo.seriePath}/${progress.bookInfo.imagesFolder}/${progress.bookInfo.thumbnailPath}`,
                book:progress.bookInfo.visibleName,
                serie:progress.serieInfo.visibleName,
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
    });

    return (
        <div className="flex flex-col gap-8">
            <Helmet>
                <title>YomiYasu - Calendario</title>
            </Helmet>
            <div className="my-4 bg-opacity-60 bg-[#363636] rounded-lg max-w-[1000px] lg:w-full lg:mx-auto mx-4">
                <DateCalendar
                    slotProps={{
                        day:{
                            inmersed:streakData
                        } as never
                    }}
                    slots={{
                        day:badgeDay
                    }}
                    sx={{
                        color:theme.palette.mode === "dark" ? "white" : "black"
                    }}
                    className="w-full"
                    views={["day"]}
                    onChange={(v)=>setSelectedDay(v)}
                    value={selectedDay}
                    onMonthChange={(v)=>setSelectedStreak({month:v.month(), year:v.year()})}
                />
                <h4 className="dark:text-white pb-4 text-center">{total} registros</h4>
            </div>
            <div className="flex flex-col gap-4 mx-4">
                <div className="mx-4">
                    <h2 className="dark:text-white">Logs del {selectedDay?.toDate().toLocaleDateString("es", {year:"numeric", month:"long", day:"numeric"})}</h2>
                </div>
                <LogGrid data={progressData} refetch={refetchProgress}/>
            </div>
        </div>
    );
}

export default Calendar;