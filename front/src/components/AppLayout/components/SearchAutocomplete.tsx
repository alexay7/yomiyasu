import {Search, Whatshot} from "@mui/icons-material";
import {Autocomplete, Box, Rating, TextField, Tooltip} from "@mui/material";
import React, {useEffect, useState} from "react";
import {api} from "../../../api/api";
import {SerieWithProgress, SeriesFilter} from "../../../types/serie";
import {BookWithProgress} from "../../../types/book";
import {useNavigate} from "react-router-dom";
import {goTo} from "../../../helpers/helpers";
import {useSettingsStore} from "../../../stores/SettingsStore";
import {getFlameColor} from "../../../helpers/series";
import {openNovel} from "../../../helpers/ttu";
import {useGlobal} from "../../../contexts/GlobalContext";

function isSerie(option:BookWithProgress | SerieWithProgress):option is SerieWithProgress {
    return option.type === "serie";
}

export function SearchAutocomplete():React.ReactElement {
    const {siteSettings} = useSettingsStore();
    const {ttuConnector} = useGlobal();
    const [searchQuery, setSearchQuery] = useState("");
    const [foundSeries, setFoundSeries] = useState<SerieWithProgress[]>([]);
    const [foundBooks, setFoundBooks] = useState<BookWithProgress[]>([]);

    const navigate = useNavigate();

    useEffect(()=>{
        async function getSeries():Promise<void> {
            if (searchQuery.length < 2) {
                setFoundSeries([]);
                return;
            }
            const res = await api.get<SeriesFilter>(`series/all?name=${searchQuery}&sort=sortName`);

            if (!res) return;

            // Sort by variant, mangas first
            res.data.sort((a, b)=>{
                if (a.variant === "manga" && b.variant === "novela") return -1;
                if (a.variant === "novela" && b.variant === "manga") return 1;
                return 0;
            });

            setFoundSeries(res.data);
        }

        async function getBooks():Promise<void> {
            if (searchQuery.length < 2) {
                setFoundBooks([]);
                return;
            }
            const res = await api.get<BookWithProgress[]>(`books/all?name=${searchQuery}&limit=10&page=1&sort=sortName`);

            if (!res) return;

            // Sort by variant, mangas first
            res.sort((a, b)=>{
                if (a.variant === "manga" && b.variant === "novela") return -1;
                if (a.variant === "novela" && b.variant === "manga") return 1;
                return 0;
            });

            setFoundBooks(res);
        }

        const search = setTimeout(()=>{
            void getSeries();
            void getBooks();
        }, 150);

        return ()=>clearTimeout(search);
    }, [searchQuery]);

    function getThumbnail(option:BookWithProgress | SerieWithProgress):string {
        if (option.variant === "manga") {
            if (option.type === "book") {
                return `mangas/${option.seriePath}/${option.imagesFolder}/${option.thumbnailPath}`;
            }
            return `mangas/${option.thumbnailPath}`;
        }
        if (option.type === "book") {
            if (option.mokured) {
                return `novelas/${option.seriePath}/${option.imagesFolder}/${option.thumbnailPath}`;
            }
            return `novelas/${option.seriePath}/${option.thumbnailPath}`;
        }
        return `novelas/${option.thumbnailPath}`;
    }

    function getMoreInfo(option:BookWithProgress | SerieWithProgress):string {
        if (isSerie(option)) {
            return `(${option.bookCount  }vols)`;
        } else if (option.variant === "manga") {
            return `(${option.pages} pags)`;
        }
        return `(${option.characters} caracteres)`;
    }

    return (
        <Autocomplete options={[...foundSeries, ...foundBooks]}
            renderOption={(props, option)=>(
                <Box component="li" sx={{"& > img": {mr: 2, flexShrink: 0}}} {...props}
                    onMouseDown={async(e)=>{
                        if (e.button === 1) {
                            if (option.type === "book") {
                                if (option.variant === "manga" || option.mokured) {
                                    if (siteSettings.openHTML) {
                                        window.open(`/api/static/mangas/${option.seriePath}/${option.path}.html`, "_href");
                                        return;
                                    }
                                    window.open(`/reader/${option._id}`, "_href");
                                    return;
                                }

                                // Novela
                                await openNovel(ttuConnector, option, true, false);
                            } else {
                                window.open(`/app/series/${option._id}`, "_href");
                            }
                        }
                    }}
                >
                    <img loading="lazy" width="50" src={`/api/static/${getThumbnail(option)}`} alt={option.visibleName} />
                    <p className="w-2/3 flex-grow">{option.visibleName} <sup className="text-xs">{getMoreInfo(option)}</sup></p>
                    {/* If option is SerieWithProgress */}
                    {isSerie(option) && option.difficulty > 0 && (
                        <div className="text-center font-semibold bg-white m-1 rounded-full flex justify-center items-center p-1">
                            <Tooltip title={`Dificultad: ${option.difficulty.toFixed(1)}/10`}>
                                <Whatshot fontSize="medium" sx={{color:getFlameColor(option.difficulty)}}/>
                            </Tooltip>
                        </div>
                    )}
                    {isSerie(option) && option.valoration && (
                        <div className="text-center font-semibold bg-white m-1 rounded-full flex justify-center items-center p-1">
                            <Rating size="small" readOnly value={option.valoration / 2} max={5} precision={0.5}/>
                        </div>
                    )}
                </Box>
            )}
            renderInput={(params) => (
                <div className="flex items-center gap-4">
                    <Search className="dark:text-white"/>
                    <TextField {...params} placeholder="Buscar" variant="standard"
                        InputProps={{...params.InputProps, disableUnderline:true}}
                    />
                </div>
            )}
            groupBy={(option)=>{
                if (option.type === "serie") {
                    if (option.variant === "manga") {
                        return "Series de Manga";
                    }
                    return "Series de Novelas";
                }
                if (option.variant === "manga") {
                    return "Mangas";
                }
                return "Novelas";
            }}
            onInputChange={(_, v, r)=>{
                if (r === "reset") {
                    setSearchQuery("");
                    return;
                }
                setSearchQuery(v);
            }}
            isOptionEqualToValue={(option, value)=>option.visibleName === value.visibleName || option.sortName === value.sortName}
            getOptionLabel={(option)=>option.visibleName}
            filterOptions={(options) => options}
            onChange={async(_, v)=>{
                // Redirigir a la página de la serie
                if (v) {
                    if (v.type === "book") {
                        if (v.variant === "manga" || v.mokured) {
                            if (siteSettings.openHTML) {
                                window.location.href = `/api/static/mangas/${v.seriePath}/${v.path}.html`;
                                return;
                            }
                            goTo(navigate, `/reader/${v._id}`);
                            return;
                        }
                        // Novela
                        await openNovel(ttuConnector, v, false, false);
                    } else {
                        goTo(navigate, `/app/series/${v._id}`);
                    }
                }
            }}
            noOptionsText="Busca series o libros de la biblioteca aquí"
            inputValue={searchQuery}
        />
    );
}