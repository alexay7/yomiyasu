import {Sort} from "@mui/icons-material";
import {Autocomplete, Divider, IconButton, MenuItem, Select, TextField} from "@mui/material";
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

    const {data:genresAndArtists = {genres:[], authors:[]}} = useQuery("genres-artists", async()=>{
        return api.get<{genres:string[], authors:string[]}>("series/genresAndArtists");
    }, {refetchOnWindowFocus:false});

    function closePopup():void {
        setOpen(false);
    }

    return (
        <Fragment>
            <IconButton onClick={()=>setOpen(true)}>
                <Sort/>
            </IconButton>
            <PopupWindow open={open} title="Filtrar y Ordenar" closePopup={closePopup}>
                <div className="flex flex-col gap-4">
                    <p>Ordenar por...</p>
                    <Select
                        fullWidth
                        value={searchParams.get("sortby") || "sortName"}
                        onChange={(e)=>{
                            setSearchParams((prev)=>{
                                return {...prev, sortby:e.target.value};
                            });
                            closePopup();
                        }}
                        label="Ordenar"
                    >
                        <MenuItem value="sortName">Nombre (A -&gt; Z)</MenuItem>
                        <MenuItem value="!sortName">Nombre (Z -&gt; A)</MenuItem>
                        <MenuItem value="!bookCount">Más volúmenes</MenuItem>
                        <MenuItem value="bookCount">Menos volúmenes</MenuItem>
                        <MenuItem value="lastModifiedDate">Más recientes</MenuItem>
                        <MenuItem value="!lastModifiedDate">Más antiguos</MenuItem>
                    </Select>
                    <Divider/>
                    <p>Filtrar por...</p>
                    <Autocomplete
                        fullWidth
                        value={searchParams.get("genre")}
                        onChange={(e, v)=>{
                            if (v) {
                                setSearchParams((prev)=>{
                                    return {...prev, genre:v};
                                });
                            } else {
                                setSearchParams({});
                            }
                            closePopup();
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
                        value={searchParams.get("author")}
                        onChange={(e, v)=>{
                            if (v) {
                                setSearchParams((prev)=>{
                                    return {...prev, author:v};
                                });
                            } else {
                                setSearchParams({});
                            }
                            closePopup();
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
            </PopupWindow>
        </Fragment>
    );
}