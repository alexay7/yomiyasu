import React, {useState} from "react";
import {useQuery} from "react-query";
import {api} from "../../../api/api";
import {UserProgress} from "../../../types/user";
import {Helmet} from "react-helmet";
import LogGrid, {LogData} from "../components/LogGrid";
import {Alert, Snackbar} from "@mui/material";

function History():React.ReactElement {
    const [total, setTotal] = useState(0);
    const [sortField, setSortField] = useState("!lastUpdateDate");
    const [paginationModel, setPaginationModel] = useState({
        pageSize: 25,
        page: 0
    });
    const [copied, setCopied] = useState(false);

    const {data:progressData = [], refetch:refetchProgress, isSuccess, isLoading} = useQuery(["progresses", paginationModel, sortField], async()=>{
        const res = await api.get<{data:UserProgress[], total:number}>(`readprogress/all?page=${paginationModel.page + 1}&limit=${paginationModel.pageSize}&sort=${sortField}`);

        if (!res) return [];

        setTotal(res.total);

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

        return rows;
    });

    return (
        <div className="dark:bg-[#121212] overflow-y-scroll h-[calc(100svh-4rem)] px-4">
            <Helmet>
                <title>YomiYasu - Historial</title>
            </Helmet>
            <Snackbar
                open={copied}
                autoHideDuration={2000}
                onClose={()=>setCopied(false)}
            >
                <Alert severity="success">Log copiado al portapapeles</Alert>
            </Snackbar>
            <div className="flex flex-col py-4">
                <h1 className="dark:text-white px-4 pb-8 pt-2 text-2xl">Historial de Lectura</h1>
                <LogGrid data={progressData} total={total} setSortField={setSortField} setPaginationModel={setPaginationModel}
                    refetch={()=>void refetchProgress()} setCopied={setCopied} loading={isLoading || !isSuccess}
                />
            </div>
        </div>
    );
}

export default History;