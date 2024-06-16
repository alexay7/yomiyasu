import React, {Fragment, useState} from "react";
import {PopupWindow} from "../PopupWindow/PopupWindow";
import {Autocomplete, FormControl, IconButton, InputLabel, MenuItem, Select, TextField} from "@mui/material";
import {useQuery} from "react-query";
import {api} from "../../api/api";
import {AnilistGenres, AnilistSerie, AnilistStatus, Serie, SerieWithProgress} from "../../types/serie";
import {toast} from "react-toastify";
import {useGlobal} from "../../contexts/GlobalContext";
import {Edit, ImportExport} from "@mui/icons-material";
import {gql, request} from "graphql-request";

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
    const [alternativeNames, setAlternativeNames] = useState(serieData.alternativeNames || []);

    const {data:genresAndArtists = {genres:[], authors:[]}} = useQuery("genres-artists", async()=>{
        return api.get<{genres:string[], authors:string[]}>("series/genresAndArtists");
    }, {enabled:open});

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
            authors,
            alternativeNames
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

    async function getAnilistData(title:string, variant:"manga" | "novela"):Promise<void> {
        const query = gql`
        query($query:String, $format:MediaFormat){
            Media(search:$query, format: $format, type: MANGA){
                status
                description
                genres
                synonyms
                siteUrl
                autoCreateForumThread
                isRecommendationBlocked
                isReviewBlocked
                modNotes
                title {
                    romaji
                    english
                    native
                }
                staff {
                    edges {
                        role
                        node {
                            name {
                                native
                                full
                            }
                        }
                    }
                }
            }
        }
        `;

        const response = await request<AnilistSerie>("https://graphql.anilist.co", query, {query:title, format:variant === "manga" ? "MANGA" : "NOVEL"});

        const data = response.Media;

        const alternativeNamesAux = [];

        if (data.title) {
            setName(data.title.native || data.title.romaji);

            if (data.title.english) {
                alternativeNamesAux.push(data.title.english);
            }

            if (data.title.romaji) {
                alternativeNamesAux.push(data.title.romaji);

                setSortName(data.title.romaji);
            }
        }

        if (data.description) {
            setSummary(data.description);
        }

        if (data.status) {
            const auxStatus = AnilistStatus[data.status];
            setStatus(auxStatus);
        }

        if (data.genres) {
            const auxGenres = data.genres.map((genre)=>AnilistGenres[genre]).filter((gen)=>!!gen);
            setGenres(auxGenres);
        }

        if (data.staff) {
            const auxAuthors = data.staff.edges.filter((edge)=>edge.role.toLowerCase().includes("story") || edge.role.toLowerCase().includes("art")).map((edge)=>edge.node.name.native || edge.node.name.full).filter((author)=>!!author);

            setAuthors(auxAuthors);
        }

        if (data.synonyms) {
            alternativeNamesAux.push(...data.synonyms);
        }

        if (alternativeNamesAux.length > 0) {
            // Remove duplicates
            const uniqueAlternativeNames = Array.from(new Set(alternativeNamesAux));

            setAlternativeNames(uniqueAlternativeNames);
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
                    <div className="flex gap-2">
                        <TextField required onChange={(e)=>setName(e.target.value)} value={name} fullWidth variant="filled" label="Nombre"/>
                        <IconButton className="shrink-0 w-[56px]" onClick={()=>{
                            void getAnilistData(name, serieData.variant);
                        }}
                        >
                            <ImportExport/>
                        </IconButton>
                    </div>
                    <TextField required onChange={(e)=>setSortName(e.target.value)} value={sortName} fullWidth variant="filled" label="Nombre para ordenar"/>
                    <TextField onChange={(e)=>setSummary(e.target.value)} value={summary} fullWidth variant="filled" label="Resumen" multiline maxRows={5}/>
                    <FormControl variant="filled">
                        <InputLabel id="statuslabel">Estado</InputLabel>
                        <Select onChange={(e)=>setStatus(e.target.value)} value={status} fullWidth labelId="statuslabel">
                            <MenuItem value="ENDED">Finalizado</MenuItem>
                            <MenuItem value="PUBLISHING">En progreso</MenuItem>
                        </Select>
                    </FormControl>
                    <Autocomplete onChange={(_, v: readonly string[])=>setGenres(Array.from(v))}  value={genres} fullWidth freeSolo multiple
                        renderInput={(params)=>(
                            <TextField
                                {...params}
                                variant="filled"
                                label="Géneros"
                            />
                        )}
                        options={genresAndArtists.genres}
                    />
                    <Autocomplete onChange={(_, v: readonly string[])=>setAuthors(Array.from(v))}  value={authors} fullWidth freeSolo multiple
                        renderInput={(params)=>(
                            <TextField
                                {...params}
                                variant="filled"
                                label="Autores"
                            />
                        )}
                        options={genresAndArtists.authors}
                    />
                    <Autocomplete onChange={(_, v: readonly string[])=>setAlternativeNames(Array.from(v))}  value={alternativeNames}
                        fullWidth freeSolo multiple
                        renderInput={(params)=>(
                            <TextField
                                {...params}
                                variant="filled"
                                label="Nombres alternativos"
                            />
                        )}
                        options={[]}
                    />
                </div>
            </PopupWindow>
        </Fragment>
    );
}