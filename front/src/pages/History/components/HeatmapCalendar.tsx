import dayjs, {type Dayjs} from "../../../lib/dayjs";
import {ChevronLeft, ChevronRight} from "lucide-react";
import {useMemo} from "react";
import {IconButton} from "../../../ui/IconButton";
import {cn} from "../../../ui/cn";

interface StreakDay {
  dayOfMonth:number;
  count:number;
}

interface HeatmapCalendarProps {
  /** Cualquier día del mes mostrado. */
  month:Dayjs;
  onMonthChange: (month:Dayjs) => void;
  streak:StreakDay[];
  /** Conteo máximo del mes (para la intensidad). */
  max:number;
  selectedDay:Dayjs | null;
  onSelectDay: (day:Dayjs) => void;
}

const weekDays = ["L", "M", "X", "J", "V", "S", "D"];

/** Calendario heatmap de lectura (estilo contribuciones de GitHub). */
export function HeatmapCalendar({month, onMonthChange, streak, max, selectedDay, onSelectDay}:HeatmapCalendarProps):React.ReactElement {
  const counts = useMemo(()=>{
    const map = new Map<number, number>();
    streak.forEach((day)=>map.set(day.dayOfMonth, day.count));
    return map;
  }, [streak]);

  const days = useMemo(()=>{
    const startOfMonth = month.startOf("month");
    const daysInMonth = month.daysInMonth();

    // dayjs: 0 = domingo; la semana empieza en lunes
    const leadingBlanks = (startOfMonth.day() + 6) % 7;

    const cells: Array<Dayjs | null> = Array.from({length:leadingBlanks}, ()=>null);

    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(startOfMonth.date(day));
    }

    return cells;
  }, [month]);

  const today = dayjs();
  const monthLabel = month.format("MMMM YYYY");
  const capitalizedLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-app-border bg-app-surface p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-fg">{capitalizedLabel}</h3>
        <div className="flex items-center gap-1">
          <IconButton label="Mes anterior" size="sm" variant="solid" onClick={()=>onMonthChange(month.subtract(1, "month"))}>
            <ChevronLeft />
          </IconButton>
          <IconButton label="Mes siguiente" size="sm" variant="solid" onClick={()=>onMonthChange(month.add(1, "month"))}>
            <ChevronRight />
          </IconButton>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day)=>(
          <span key={day} className="py-1 text-center text-[11px] font-semibold text-fg-muted">{day}</span>
        ))}

        {days.map((day, index)=>{
          if (!day) return <span key={`blank-${index}`} />;

          const count = counts.get(day.date()) ?? 0;
          const intensity = max > 0 ? count / max : 0;
          const isSelected = selectedDay ? day.isSame(selectedDay, "day") : false;
          const isToday = day.isSame(today, "day");

          return (
            <button
              key={day.format("YYYY-MM-DD")}
              type="button"
              onClick={()=>onSelectDay(day)}
              title={count > 0 ? `${count} registro${count === 1 ? "" : "s"}` : "Sin registros"}
              className={cn(
                "relative flex aspect-square items-center justify-center rounded-md text-sm transition-colors",
                count > 0 ? "font-semibold text-white hover:opacity-90" : "text-fg-muted hover:bg-tint",
                isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-app-surface",
                isToday && !isSelected && "font-semibold text-primary",
              )}
              style={count > 0 ? {backgroundColor:`color-mix(in oklab, var(--primary-color) ${Math.round((0.25 + intensity * 0.75) * 100)}%, transparent)`} : undefined}
            >
              {day.date()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
