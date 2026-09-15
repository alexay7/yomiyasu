import React, {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {api} from "../../../api/api";
import {keys} from "../../../lib/queryKeys";
import {useTitle} from "../../../lib/useTitle";
import type {UserProgress} from "../../../types/user";
import type {SortDirection, TableSort} from "../../../ui/Table";
import {Snackbar} from "../../../ui/Snackbar";
import {LogTable, type LogData} from "../components/LogTable";

const PAGE_SIZE = 25;

function History():React.ReactElement {
    const [sort, setSort] = useState<TableSort>({field:"lastUpdateDate", direction:"desc"});
    const [page, setPage] = useState(1);
    const [copied, setCopied] = useState(false);

    useTitle("Historial");

    const apiSort = `${sort.direction === "desc" ? "!" : ""}${sort.field}`;

    const {data = {rows:[], total:0}, refetch, isSuccess, isLoading} = useQuery({
        queryKey:keys.progressLogs({page, sort:apiSort}),
        queryFn:async()=>{
            const res = await api.get<{data:UserProgress[], total:number}>(`readprogress/all?page=${page}&limit=${PAGE_SIZE}&sort=${apiSort}`);

            if (!res) return {rows:[], total:0};

            const rows:LogData[] = [];

            res.data.forEach((progress)=>{
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
                    characters:progress.characters || 0
                });
            });

            return {rows, total:res.total};
        }
    });

    function handleSortChange(field:string, direction:SortDirection):void {
        setSort({field, direction});
        setPage(1);
    }

    const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-8">
            <header className="flex flex-col gap-1">
                <h1 className="text-xl font-bold text-fg">Historial de lectura</h1>
                <p className="text-sm text-fg-muted">
                    {data.total.toLocaleString()} registros. Haz click en una fila para copiar el log.
                </p>
            </header>

            <LogTable
                data={data.rows}
                loading={isLoading || !isSuccess}
                refetch={()=>void refetch()}
                onCopied={()=>setCopied(true)}
                sort={sort}
                onSortChange={handleSortChange}
                page={page}
                pages={pages}
                onPageChange={setPage}
            />

            <Snackbar open={copied} onOpenChange={setCopied} message="Log copiado al portapapeles" />
        </div>
    );
}

export default History;
