import React from "react";
import {useQuery} from "react-query";
import {api} from "../../api/api";
import {UserProgress} from "../../types/user";
import {Table, TableBody, TableCell, TableHead, TableRow} from "@mui/material";
import {formatTime, goTo} from "../../helpers/helpers";
import {useNavigate} from "react-router-dom";

export function History():React.ReactElement {
    const {data:progressData = []} = useQuery("progresses", async()=>{
        const res = await api.get<UserProgress[]>("readprogress/all");
        return res;
    }, {refetchOnWindowFocus:false});

    const navigate = useNavigate();

    return (
        <div className="bg-[#121212] overflow-x-hidden p-4 pb-4">
            <h1 className="text-white px-4 pb-8 text-2xl">Historial de Lectura</h1>
            <div className="bg-[#1E1E1E] mx-4 flex justify-center rounded-lg overflow-hidden shadow-lg shadow-[#1E1E1E]">
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell></TableCell>
                            <TableCell>Libro</TableCell>
                            <TableCell>Serie</TableCell>
                            <TableCell>Estado</TableCell>
                            <TableCell>Páginas leídas</TableCell>
                            <TableCell>Inicio</TableCell>
                            <TableCell>Fin</TableCell>
                            <TableCell>Tiempo</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {progressData.map((progress)=>(
                            <TableRow key={progress._id} className="hover:bg-[#303030]">
                                <TableCell className="cursor-pointer" onClick={()=>{
                                    goTo(navigate, `/app/series/${progress.serieInfo._id}`);
                                }}
                                >
                                    <div className="w-12">
                                        <img src={`/api/static/${progress.bookInfo.seriePath}/${progress.bookInfo.imagesFolder}/${progress.bookInfo.thumbnailPath}`} alt="" />
                                    </div>
                                </TableCell>
                                <TableCell className="cursor-pointer" onClick={()=>{
                                    goTo(navigate, `/app/series/${progress.serieInfo._id}`);
                                }}
                                >{progress.bookInfo.visibleName}
                                </TableCell>
                                <TableCell className="cursor-pointer" onClick={()=>{
                                    goTo(navigate, `/app/series/${progress.serieInfo._id}`);
                                }}
                                >{progress.serieInfo.visibleName}
                                </TableCell>
                                <TableCell>{progress.status === "completed" ? "Completado" : "Leyendo"}</TableCell>
                                <TableCell>{progress.currentPage}</TableCell>
                                <TableCell>{new Date(progress.startDate).toLocaleString()}</TableCell>
                                <TableCell>{progress.endDate ? new Date(progress.endDate).toLocaleString() : ""}</TableCell>
                                <TableCell>{formatTime(progress.time)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}