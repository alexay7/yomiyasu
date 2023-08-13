import {RestartAlt, Shuffle} from "@mui/icons-material";
import {Autocomplete, Checkbox, FormControl, FormControlLabel, FormLabel, IconButton, InputLabel, MenuItem, Radio, RadioGroup, Select, Slider, TextField, Tooltip} from "@mui/material";
import React, {Fragment, useState} from "react";
import {PopupWindow} from "../../../components/PopupWindow/PopupWindow";
import {useQuery} from "react-query";
import {api} from "../../../api/api";
import {SerieWithProgress} from "../../../types/serie";
import {toast} from "react-toastify";

export function LibraryRandom():React.ReactElement {
    const [open, setOpen] = useState(false);
    const [difficulty, setDifficulty] = useState<number[]>([0, 10]);
    const [genre, setGenre] = useState("");
    const [author, setAuthor] = useState("");
    const [status, setStatus] = useState("");
    const [readProgress, setReadProgress] = useState("all");
    const [readlist, setReadlist] = useState<boolean>(false);

    const {data:genresAndArtists = {genres:[], authors:[]}} = useQuery("genres-artists", async()=>{
        return api.get<{genres:string[], authors:string[]}>("series/genresAndArtists");
    }, {refetchOnWindowFocus:false});


    function closePopup():void {
        setOpen(false);
    }

    async function filterSeries(e:React.FormEvent<HTMLFormElement>):Promise<void> {
        e.preventDefault();

        let link = "series/random?";

        if (genre && genre !== "") {
            link += `genre=${genre}&`;
        }

        if (readProgress && readProgress !== "") {
            link += `readprogress=${readProgress}&`;
        }

        if (author && author !== "") {
            link += `author=${author}&`;
        }

        if (difficulty && difficulty.length === 2) {
            link += `min=${difficulty[0]}&max=${difficulty[1]}&`;
        }

        if (status && status !== "") {
            link += `status=${status}&`;
        }

        if (readlist) {
            link += "readlist=true&";
        }

        try {
            const res = await api.get<SerieWithProgress>(link);

            window.location.href = `/app/series/${res._id}`;
        } catch {
            toast.error("Ninguna serie coincide con los filtros indicados");
        }
    }

    return (
        <Fragment>
            <Tooltip title="Elegir serie aleatoriamente">
                <IconButton onClick={()=>setOpen(true)}>
                    <Shuffle/>
                </IconButton>
            </Tooltip>
            <PopupWindow open={open} title="Modo aleatorio" closePopup={closePopup} onSubmit={filterSeries} customSaveButton="Hacer girar el dado">
                <div className="flex flex-col gap-4">
                    <p>Filtrar por...</p>
                    <div className="ml-4 flex flex-col gap-4">
                        <FormControl className="w-full">
                            <FormLabel>Dificultad</FormLabel>
                            <div className="flex gap-4 items-center">
                                <Slider onChange={(e, v)=>{
                                    setDifficulty(v as number[]);
                                }} value={difficulty} max={10} min={0} step={1}
                                marks valueLabelDisplay="auto"
                                />
                                <IconButton onClick={()=>{
                                    setDifficulty([0, 10]);
                                }}
                                >
                                    <RestartAlt/>
                                </IconButton>
                            </div>
                        </FormControl>
                        <FormControl>
                            <InputLabel id="status">Estado</InputLabel>
                            <Select
                                labelId="status"
                                fullWidth
                                value={status}
                                onChange={(e)=>{
                                    setStatus(e.target.value);
                                }}
                            >
                                <MenuItem value="">Todas</MenuItem>
                                <MenuItem value="ENDED">Completada</MenuItem>
                                <MenuItem value="PUBLISHING">En progreso</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl className="w-full">
                            <FormLabel>Género de la serie</FormLabel>
                            <Autocomplete
                                fullWidth
                                value={genre}
                                onChange={(e, v)=>{
                                    setGenre(v || "");
                                }}
                                renderInput={(params)=>(
                                    <TextField
                                        {...params}
                                        variant="standard"
                                        label="Géneros"
                                    />
                                )}
                                options={genresAndArtists.genres}
                            />
                        </FormControl>
                        <FormControl className="w-full">
                            <FormLabel>Autor de la serie</FormLabel>
                            <Autocomplete
                                fullWidth
                                value={author}
                                onChange={(e, v)=>{
                                    setAuthor(v || "");
                                }}
                                renderInput={(params)=>(
                                    <TextField
                                        {...params}
                                        variant="standard"
                                        label="Autores"
                                    />
                                )}
                                options={genresAndArtists.authors}
                            />
                        </FormControl>
                        <FormControl className="py-4 w-full flex">
                            <FormControlLabel className="select-none" control={
                                <Checkbox checked={readlist} onChange={(e, c)=>{
                                    setReadlist(c);
                                }}
                                />
                            } label="¿En lista de &quot;Leer más tarde&quot;?"
                            />
                        </FormControl>
                        <FormControl className="py-4 w-full">
                            <FormLabel>Estado de lectura de la serie</FormLabel>
                            <RadioGroup
                                row
                                value={readProgress}
                                onChange={(e, v)=>{
                                    setReadProgress(v);
                                }}
                            >
                                <FormControlLabel value="completed" control={<Radio />} label="Completada" />
                                <FormControlLabel value="reading" control={<Radio />} label="En progreso" />
                                <FormControlLabel value="unread" control={<Radio />} label="Sin empezar" />
                                <FormControlLabel value="all" control={<Radio />} label="Todas" />
                            </RadioGroup>
                        </FormControl>
                    </div>
                </div>
            </PopupWindow>
        </Fragment>
    );
}