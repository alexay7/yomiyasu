/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";
import {useQuery} from "react-query";
import {api} from "../../api/api";
import {UserProgress} from "../../types/user";
import {Table, TableBody, TableCell, TableHead, TableRow} from "@mui/material";
import {formatTime, goTo} from "../../helpers/helpers";
import {useNavigate} from "react-router-dom";
import {DataGrid, GridColDef, GridToolbar, GridValueGetterParams} from "@mui/x-data-grid";

export function History():React.ReactElement {
    const {data:progressData = []} = useQuery("progresses", async()=>{
        const res = await api.get<UserProgress[]>("readprogress/all");

        const rows:{id:number, image:string, book:string, serie:string, status:string,
            pages:number, start:Date, end:Date | undefined, time:number, lastupdate:Date | undefined}[] = [];

        res.forEach((progress, i)=>{
            rows.push({
                id:i,
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

    const navigate = useNavigate();

    const columns: GridColDef[] = [
        {
            field: "id",
            headerName: "ID",
            width: 20,
            sortable:false,
            filterable:false
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
        <div className="bg-[#121212] overflow-x-hidden p-4 pb-4">
            <h1 className="text-white px-4 pb-8 pt-2 text-2xl">Historial de Lectura</h1>
            <div className="bg-[#1E1E1E] mx-4 flex justify-center shadow-lg shadow-[#1E1E1E]">
                <DataGrid rows={progressData} columns={columns} slots={{toolbar:GridToolbar}}/>
            </div>
        </div>
    );
}