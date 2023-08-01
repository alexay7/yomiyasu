import {RestartAlt, Sort} from "@mui/icons-material";
import {Autocomplete, Divider, IconButton, MenuItem, Select, Slider, TextField, Tooltip} from "@mui/material";
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
                        <MenuItem value="lastModifiedDate">Más recientes</MenuItem>
                        <MenuItem value="!lastModifiedDate">Más antiguos</MenuItem>
                        <MenuItem value="difficulty">Más fáciles</MenuItem>
                        <MenuItem value="!difficulty">Más difíciles</MenuItem>
                    </Select>
                    <Divider/>
                    <p>Filtrar por...</p>
                    <div className="ml-4">
                        <div className="flex flex-col gap-2">
                            <p className="text-gray-300">Dificultad</p>
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
                        </div>
                        <Autocomplete
                            fullWidth
                            value={genre}
                            onChange={(e, v)=>{
                                setGenre(v);
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
                        <Autocomplete
                            fullWidth
                            value={author}
                            onChange={(e, v)=>{
                                setAuthor(v);
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
                    </div>
                </div>
            </PopupWindow>
        </Fragment>
    );
}