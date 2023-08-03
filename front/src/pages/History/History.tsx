import React from "react";
import {useQuery} from "react-query";
import {api} from "../../api/api";
import {UserProgress} from "../../types/user";
import {IconButton} from "@mui/material";
import {formatTime} from "../../helpers/helpers";
import {DataGrid, GridColDef, GridToolbar} from "@mui/x-data-grid";
import {Helmet} from "react-helmet";
import {Delete} from "@mui/icons-material";
import {BookProgress} from "../../types/book";
import {toast} from "react-toastify";

function History():React.ReactElement {
    const {data:progressData = [], refetch:refetchProgress} = useQuery("progresses", async()=>{
        const res = await api.get<UserProgress[]>("readprogress/all");

        const rows:{id:string, image:string, book:string, serie:string, status:string,
            pages:number, start:Date, end:Date | undefined, time:number, lastupdate:Date | undefined}[] = [];

        res.forEach((progress)=>{
            rows.push({
                id:progress._id,
                image:`/api/static/${progress.bookInfo.seriePath}/${progress.bookInfo.imagesFolder}/${progress.bookInfo.thumbnailPath}`,
                book:progress.bookInfo.visibleName,
                serie:progress.serieInfo.visibleName,
                status:progress.status,
                pages:progress.currentPage,
                start:progress.startDate,
                end:progress.endDate,
                time:progress.time,
                lastupdate:progress.lastUpdateDate
            });
        });

        return rows;
    }, {refetchOnWindowFocus:false});

    async function deleteProgress(id:string):Promise<void> {
        const res = await api.delete<BookProgress>(`readprogress/${id}`);

        if (res) {
            toast.success("Progreso borrado con éxito");
            void refetchProgress();
        }
    }

    const columns: GridColDef[] = [
        {
            field: "id",
            headerName: "Borrar",
            width: 20,
            sortable:false,
            filterable:false,
            renderCell:(params)=>(
                <IconButton color="error" onClick={()=>{
                    if (confirm("¿Seguro que quieres borrar el progreso?")) {
                        void deleteProgress(params.value);
                    }
                }}
                >
                    <Delete/>
                </IconButton>
            )
        },
        {
            field: "image",
            headerName: "",
            renderCell:(params)=><img loading="lazy" src={params.value as string} alt="" />,
            sortable:false,
            filterable:false
        },
        {
            field: "book",
            headerName: "Libro",
            width: 300
        },
        {
            field: "serie",
            headerName: "Serie",
            width: 300
        },
        {
            field: "status",
            headerName: "Estado",
            width: 110
        },
        {
            field: "pages",
            headerName: "Páginas leídas",
            width: 120
        },
        {
            field: "lastupdate",
            headerName: "Última actualización",
            width: 160,
            valueFormatter:(params)=>new Date(params.value).toLocaleString()
        },
        {
            field: "start",
            headerName: "Fecha de comienzo",
            width: 160,
            valueFormatter:(params)=>new Date(params.value).toLocaleString()
        },
        {
            field: "end",
            headerName: "Fecha de finalización",
            width: 170,
            valueFormatter:(params)=>params.value ? new Date(params.value).toLocaleString() : ""
        },
        {
            field: "time",
            headerName: "Tiempo",
            width: 120,
            valueFormatter:(params)=>formatTime(params.value)
        }
    ];

    return (
        <div className="dark:bg-[#121212] overflow-x-hidden p-4 pb-4">
            <Helmet>
                <title>YomiYasu - Historial</title>
            </Helmet>
            <h1 className="dark:text-white px-4 pb-8 pt-2 text-2xl">Historial de Lectura</h1>
            <div className="dark:bg-[#1E1E1E] mx-4 flex justify-center shadow-lg dark:shadow-[#1E1E1E] shadow-gray-500">
                <DataGrid rows={progressData} columns={columns} slots={{toolbar:GridToolbar}}/>
            </div>
        </div>
    );
}

export default History;