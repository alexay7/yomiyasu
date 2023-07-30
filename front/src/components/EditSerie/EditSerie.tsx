import React, {Fragment, useState} from "react";
import {PopupWindow} from "../PopupWindow/PopupWindow";
import {Autocomplete, FormControl, IconButton, InputLabel, MenuItem, Select, TextField} from "@mui/material";
import {useQuery} from "react-query";
import {api} from "../../api/api";
import {Serie, SerieWithProgress} from "../../types/serie";
import {toast} from "react-toastify";
import {useGlobal} from "../../contexts/GlobalContext";
import {Edit} from "@mui/icons-material";

interface EditSerieProps {
    serieData:SerieWithProgress;
    circleIcon?:boolean;
    handleClose?:()=>void
}

export function EditSerie(props:EditSerieProps):React.ReactElement {
    const {serieData, circleIcon, handleClose} = props;
    const {forceReload} = useGlobal();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState(serieData.visibleName);
    const [sortName, setSortName] = useState(serieData.sortName);
    const [summary, setSummary] = useState(serieData.summary);
    const [status, setStatus] = useState(serieData.status || "");
    const [genres, setGenres] = useState(serieData.genres);
    const [authors, setAuthors] = useState(serieData.authors);

    const {data:genresAndArtists = {genres:[], authors:[]}} = useQuery("genres-artists", async()=>{
        return api.get<{genres:string[], authors:string[]}>("series/genresAndArtists");
    }, {refetchOnWindowFocus:false, enabled:open});

    function closePopup():void {
        setOpen(false);
    }

    async function saveChanges(e:React.FormEvent<HTMLFormElement>):Promise<void> {
        e.preventDefault();
        if (name === "" || sortName === "") {
            toast.error("Rellena todos los campos obligatorios");
            return;
        }

        const body:Partial<Serie> = {
            visibleName:name,
            sortName,
            summary,
            status,
            genres,
            authors
        };

        try {
            const response = await api.patch<Partial<Serie>, Serie>(`series/${serieData._id}`, body);
            if (response) {
                toast.success(`Datos de ${name} actualizados con éxito`);
                closePopup();
                forceReload("all");
            }
        } catch {
            toast.error("No tienes permisos para realizar esa acción");
        }
    }

    return (
        <Fragment>
            {circleIcon ? (
                <IconButton onClick={()=>setOpen(true)}>
                    <Edit/>
                </IconButton>
            ) : (
                <MenuItem key="edit" onClick={()=>{
                    setOpen(true);
                    if (handleClose) {
                        handleClose();
                    }
                }}
                >
                    Editar
                </MenuItem>
            )}
            <PopupWindow open={open} title={`Editar ${serieData.visibleName}`} closePopup={closePopup} onSubmit={saveChanges}>
                <div className="flex flex-col gap-4">
                    <TextField required onChange={(e)=>setName(e.target.value)} value={name} fullWidth variant="filled" label="Nombre"/>
                    <TextField required onChange={(e)=>setSortName(e.target.value)} value={sortName} fullWidth variant="filled" label="Nombre para ordenar"/>
                    <TextField onChange={(e)=>setSummary(e.target.value)} value={summary} fullWidth variant="filled" label="Resumen" multiline maxRows={5}/>
                    <FormControl variant="filled">
                        <InputLabel id="statuslabel">Estado</InputLabel>
                        <Select onChange={(e)=>setStatus(e.target.value)} value={status} fullWidth labelId="statuslabel">
                            <MenuItem value="ENDED">Finalizado</MenuItem>
                            <MenuItem value="PUBLISHING">En progreso</MenuItem>
                        </Select>
                    </FormControl>
                    <Autocomplete onChange={(e, v)=>setGenres(v)} value={genres} fullWidth freeSolo multiple
                        renderInput={(params)=>(
                            <TextField
                                {...params}
                                variant="filled"
                                label="Géneros"
                            />
                        )}
                        options={genresAndArtists.genres}
                    />
                    <Autocomplete onChange={(e, v)=>setAuthors(v)} value={authors} fullWidth freeSolo multiple
                        renderInput={(params)=>(
                            <TextField
                                {...params}
                                variant="filled"
                                label="Autores"
                            />
                        )}
                        options={genresAndArtists.authors}
                    />
                </div>
            </PopupWindow>
        </Fragment>
    );
}