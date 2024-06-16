import React from "react";
import {formatTime} from "../../../helpers/helpers";
import {IconButton} from "@mui/material";
import {toast} from "react-toastify";
import {api} from "../../../api/api";
import {BookProgress} from "../../../types/book";
import {DataGrid, GridColDef, GridToolbar} from "@mui/x-data-grid";
import {Delete} from "@mui/icons-material";
import {useNavigate} from "react-router-dom";

export interface LogData {
    id:string,
    image:string,
    book:string,
    bookId:string,
    serie:string,
    tipo:"manga" | "novela",
    status:string,
    currentPage:number,
    startDate:Date,
    endDate:Date | undefined,
    time:number,
    lastUpdateDate:Date | undefined,
    characters:number,
}

interface LogGridProps {
    data:LogData[],
    refetch:()=>void,
    total?:number,
    setSortField?:(v:React.SetStateAction<string>)=>void,
    paginationModel?:{pageSize:number, page:number},
    setPaginationModel?:(v:React.SetStateAction<{pageSize:number, page:number}>)=>void,
    setCopied?:React.Dispatch<React.SetStateAction<boolean>>,
    loading:boolean
}

function LogGrid(props:LogGridProps):React.ReactElement {
    const navigate = useNavigate();
    const {data, refetch, paginationModel, setPaginationModel, setSortField, total, setCopied, loading} = props;

    async function deleteProgress(id:string):Promise<void> {
        const res = await api.delete<BookProgress>(`readprogress/${id}`);

        if (res) {
            toast.success("Progreso borrado con éxito");
            void refetch();
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
            renderCell:(params)=>(
                <img className="cursor-pointer" loading="lazy" src={params.value as string} alt="" onClick={
                    ()=> {
                    // Confirmation from the user
                        if (!confirm("¿Seguro que quieres abrir el libro?")) return;

                        navigate(`/reader/${params.row.bookId}`);
                    }
                }
                />
            ),
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
            field: "tipo",
            headerName: "Tipo",
            width: 100,
            filterable:true
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
            valueFormatter:(value:number)=>formatTime(value),
            filterable:false
        },
        {
            field: "lastUpdateDate",
            headerName: "Última actualización",
            width: 160,
            valueFormatter:(value:Date)=>new Date(value).toLocaleString(),
            filterable:false
        },
        {
            field: "startDate",
            headerName: "Fecha de comienzo",
            width: 160,
            valueFormatter:(value:Date)=>new Date(value).toLocaleString(),
            filterable:false
        },
        {
            field: "endDate",
            headerName: "Fecha de finalización",
            width: 170,
            valueFormatter:(value:Date)=>value ? new Date(value).toLocaleString() : "",
            filterable:false
        }
    ];

    return (
        <div className="dark:bg-[#1E1E1E] mx-4 flex justify-center shadow-lg dark:shadow-[#1E1E1E] shadow-gray-500 hover:cursor-cell" style={{height:loading ? "170px" : undefined, width:"100%"}}>
            <DataGrid
                loading={loading}
                rows={data} columns={columns} slots={{
                    toolbar:setPaginationModel ? GridToolbar : null}} onRowClick={(row)=>{
                    const rowData = row.row as LogData;
                    let text = `.log manga ${rowData.currentPage} ${rowData.book}`;

                    if (rowData.tipo === "novela") {
                        text = `.log lectura ${rowData.characters} ${rowData.book}`;
                    }

                    if (rowData.time > 59) {
                        text += `;${Math.floor(rowData.time / 60)}`;
                    }

                    if (rowData.characters > 0 && rowData.tipo === "manga") {
                        text += `&${rowData.characters}`;
                    }

                    void navigator.clipboard.writeText(text);
                    setCopied?.(true);
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
                    if (!setSortField) return;
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
    );
}

export default LogGrid;