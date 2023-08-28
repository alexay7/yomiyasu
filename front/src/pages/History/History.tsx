import React, {useState} from "react";
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

interface LogData {
    id:string,
    image:string,
    book:string,
    bookId:string,
    serie:string,
    status:string,
    currentPage:number,
    startDate:Date,
    endDate:Date | undefined,
    time:number,
    lastUpdateDate:Date | undefined,
    characters:number
}

function History():React.ReactElement {
    const [total, setTotal] = useState(0);
    const [sortField, setSortField] = useState("!lastUpdateDate");
    const [paginationModel, setPaginationModel] = useState({
        pageSize: 25,
        page: 0
    });

    const {data:progressData = [], refetch:refetchProgress} = useQuery(["progresses", paginationModel, sortField], async()=>{
        const res = await api.get<{data:UserProgress[], total:number}>(`readprogress/all?page=${paginationModel.page + 1}&limit=${paginationModel.pageSize}&sort=${sortField}`);

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
                characters:progress.bookInfo.pageChars && progress.bookInfo.pageChars.length >=
                    progress.currentPage ? progress.bookInfo.pageChars[progress.currentPage - 1] : 0
            });
        });

        return rows;
    });

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
                        window.localStorage.removeItem(params.row.bookId);
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
            width: 300,
            filterable:false
        },
        {
            field: "serie",
            headerName: "Serie",
            width: 300,
            filterable:false
        },
        {
            field: "status",
            headerName: "Estado",
            width: 110,
            filterable:false
        },
        {
            field: "currentPage",
            headerName: "Páginas leídas",
            width: 120,
            filterable:false
        },
        {
            field: "characters",
            headerName: "Caracteres leídos",
            sortable:false,
            width: 120,
            filterable:false
        },
        {
            field: "time",
            headerName: "Tiempo",
            width: 120,
            valueFormatter:(params)=>formatTime(params.value),
            filterable:false
        },
        {
            field: "lastUpdateDate",
            headerName: "Última actualización",
            width: 160,
            valueFormatter:(params)=>new Date(params.value).toLocaleString(),
            filterable:false
        },
        {
            field: "startDate",
            headerName: "Fecha de comienzo",
            width: 160,
            valueFormatter:(params)=>new Date(params.value).toLocaleString(),
            filterable:false
        },
        {
            field: "endDate",
            headerName: "Fecha de finalización",
            width: 170,
            valueFormatter:(params)=>params.value ? new Date(params.value).toLocaleString() : "",
            filterable:false
        }
    ];

    return (
        <div className="dark:bg-[#121212] overflow-x-hidden p-4 pb-4">
            <Helmet>
                <title>YomiYasu - Historial</title>
            </Helmet>
            <h1 className="dark:text-white px-4 pb-8 pt-2 text-2xl">Historial de Lectura</h1>
            <div className="dark:bg-[#1E1E1E] mx-4 flex justify-center shadow-lg dark:shadow-[#1E1E1E] shadow-gray-500">
                <DataGrid rows={progressData} columns={columns} slots={{toolbar:GridToolbar}} onRowClick={(row)=>{
                    const rowData = row.row as LogData;
                    let text = `.log manga ${rowData.currentPage} ${rowData.book}`;

                    if (rowData.time > 59) {
                        text += `;${Math.floor(rowData.time / 60)}`;
                    }

                    if (rowData.characters > 0) {
                        text += `&${rowData.characters}`;
                    }

                    void navigator.clipboard.writeText(text);
                }}
                initialState={{
                    sorting:{
                        sortModel:[{field:"lastUpdateDate", sort:"desc"}]
                    }
                }}
                paginationModel={paginationModel}
                paginationMode="server"
                onPaginationModelChange={setPaginationModel}
                rowCount={total}
                sortingMode="server"
                onSortModelChange={(m)=>{
                    if (m && m.length > 0) {
                        const [chosen] = m;

                        let {field} = chosen;

                        if (chosen.sort === "desc") {
                            field = `!${field}`;
                        }

                        setSortField(field);
                    }
                }}
                disableColumnFilter
                />
            </div>
        </div>
    );
}

export default History;