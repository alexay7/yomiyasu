import {RestartAlt, Sort} from "@mui/icons-material";
import {Autocomplete, Checkbox, Divider, FormControl, FormControlLabel, FormLabel, IconButton, InputLabel, MenuItem, Radio, RadioGroup, Select, Slider, TextField, Tooltip} from "@mui/material";
import React, {Fragment, useState} from "react";
import {PopupWindow} from "../../../components/PopupWindow/PopupWindow";
import {SetURLSearchParams} from "react-router-dom";
import {useQuery} from "react-query";
import {api} from "../../../api/api";

interface LibraryFilterProps {
    setSearchParams:SetURLSearchParams,
    searchParams:URLSearchParams
}

export function LibraryFilter(props:LibraryFilterProps):React.ReactElement {
    const {searchParams, setSearchParams} = props;
    const [open, setOpen] = useState(false);
    const [sort, setSort] = useState(searchParams.get("sortBy") || "sortName");
    const [difficulty, setDifficulty] = useState<number[]>([parseInt(searchParams.get("min") || "0"), parseInt(searchParams.get("max") || "10")]);
    const [genre, setGenre] = useState(searchParams.get("genre") || null);
    const [author, setAuthor] = useState(searchParams.get("author") || null);
    const [status, setStatus] = useState(searchParams.get("status") || "");
    const [readProgress, setReadProgress] = useState<string>(searchParams.get("readprogress") || "all");
    const [readlist, setReadlist] = useState<boolean>(false);

    const {data:genresAndArtists = {genres:[], authors:[]}} = useQuery("genres-artists", async()=>{
        return api.get<{genres:string[], authors:string[]}>("series/genresAndArtists");
    }, {refetchOnWindowFocus:false});


    function closePopup():void {
        setOpen(false);
    }

    function filterSeries(e:React.FormEvent<HTMLFormElement>):void {
        e.preventDefault();

        const filter:Record<string, string> = {
            sortBy:sort,
            min:`${difficulty[0]}`,
            max:`${difficulty[1]}`
        };

        if (genre) {
            filter.genre = genre;
        }

        if (author) {
            filter.author = author;
        }

        if (readProgress && readProgress !== "all") {
            filter.readprogress = readProgress;
        }

        if (status) {
            filter.status = status;
        }

        if (readlist) {
            filter.readlist = "true";
        }

        setSearchParams(filter);
        closePopup();
    }

    return (
        <Fragment>
            <Tooltip title="Abrir filtros">
                <IconButton onClick={()=>setOpen(true)}>
                    <Sort/>
                </IconButton>
            </Tooltip>
            <PopupWindow open={open} title="Filtrar y Ordenar" closePopup={closePopup} onSubmit={filterSeries}>
                <div className="flex flex-col gap-4">
                    <p>Ordenar por...</p>
                    <Select
                        fullWidth
                        value={sort}
                        onChange={(e)=>{
                            setSort(e.target.value);
                        }}
                        label="Ordenar"
                    >
                        <MenuItem value="sortName">Nombre (A -&gt; Z)</MenuItem>
                        <MenuItem value="!sortName">Nombre (Z -&gt; A)</MenuItem>
                        <MenuItem value="!bookCount">Más volúmenes</MenuItem>
                        <MenuItem value="bookCount">Menos volúmenes</MenuItem>
                        <MenuItem value="lastModifiedDate">Más antiguos</MenuItem>
                        <MenuItem value="!lastModifiedDate">Más recientes</MenuItem>
                        <MenuItem value="difficulty">Más fáciles</MenuItem>
                        <MenuItem value="!difficulty">Más difíciles</MenuItem>
                    </Select>
                    <Divider/>
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
                                <FormControlLabel value="all" control={<Radio />} label="Mostrar todas" />
                            </RadioGroup>
                        </FormControl>
                    </div>
                </div>
            </PopupWindow>
        </Fragment>
    );
}