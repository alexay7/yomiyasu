import React, {useState} from "react";
import {useQuery} from "react-query";
import {api} from "../../../api/api";
import {UserProgress} from "../../../types/user";
import {Helmet} from "react-helmet";
import LogGrid, {LogData} from "../components/LogGrid";

function History():React.ReactElement {
    const [total, setTotal] = useState(0);
    const [sortField, setSortField] = useState("!lastUpdateDate");
    const [paginationModel, setPaginationModel] = useState({
        pageSize: 25,
        page: 0
    });

    const {data:progressData = [], refetch:refetchProgress} = useQuery(["progresses", paginationModel, sortField], async()=>{
        const res = await api.get<{data:UserProgress[], total:number}>(`readprogress/all?page=${paginationModel.page + 1}&limit=${paginationModel.pageSize}&sort=${sortField}`);

        if (!res) return [];

        setTotal(res.total);

        const rows:LogData[] = [];

        res.data.forEach((progress)=>{
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
                characters:progress.characters || 0
            });
        });

        return rows;
    });

    return (
        <div className="dark:bg-[#121212] overflow-x-hidden p-4">
            <Helmet>
                <title>YomiYasu - Historial</title>
            </Helmet>
            <h1 className="dark:text-white px-4 pb-8 pt-2 text-2xl">Historial de Lectura</h1>
            <LogGrid data={progressData} total={total} setSortField={setSortField} setPaginationModel={setPaginationModel}
                refetch={()=>void refetchProgress()}
            />
        </div>
    );
}

export default History;