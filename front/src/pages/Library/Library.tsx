import React, {useEffect, useState} from "react";
import {useQuery} from "react-query";
import {api} from "../../api/api";
import {Alphabet, SeriesFilter} from "../../types/serie";
import {SerieComponent} from "../../components/SerieComponent/SerieComponent";
import {IconButton, Menu, MenuItem, Pagination, Tooltip} from "@mui/material";
import {useNavigate, useSearchParams} from "react-router-dom";
import {ArrowBack, DashboardCustomize, RestorePage} from "@mui/icons-material";
import {goBack} from "../../helpers/helpers";
import {useGlobal} from "../../contexts/GlobalContext";
import {LibrarySettings} from "./components/LibrarySettings";
import {useAuth} from "../../contexts/AuthContext";
import {LibraryFilter} from "./components/LibraryFilter";
import {Helmet} from "react-helmet";
import {LibraryRandom} from "./components/LibraryRandom";
import {LibraryGridSkeleton, SectionError} from "../../components/Skeletons/Skeletons";
import {useSettingsStore} from "../../stores/SettingsStore";

interface LibraryProps {
    variant: "manga" | "novela";
}

function Library({variant}:LibraryProps):React.ReactElement {
    const [searchParams, setSearchParams] = useSearchParams();
    const genre = searchParams.get("genre");
    const author = searchParams.get("author");
    const sortby = searchParams.get("sortBy");
    const min = searchParams.get("min");
    const max = searchParams.get("max");
    const readprogress = searchParams.get("readprogress");
    const status = searchParams.get("status");
    const readlist = searchParams.get("readlist");
    const pageParam = parseInt(searchParams.get("page") || "1");
    const {reloaded} = useGlobal();
    const {userData} = useAuth();
    const {siteSettings, modifySiteSettings} = useSettingsStore();
    const [selectedLetter, setSelectedLetter] = useState("ALL");
    const elements = siteSettings.libraryLimit || window.localStorage.getItem("limit") || "25";
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const navigate = useNavigate();

    const {data:series = {pages:1, data:[]}, refetch:refetchSeries, isLoading, isError} = useQuery(
        ["seriesData", variant, selectedLetter, pageParam, elements, genre, author, sortby, min, max, readprogress, status, readlist],
        async()=>{
            let link = `series/${variant}?`;

            if (selectedLetter !== "ALL") {
                link += `firstLetter=${selectedLetter.replace("#", "SPECIAL")}&`;
            }

            if (genre) {
                link += `genre=${genre}&`;
            }

            if (readprogress) {
                link += `readprogress=${readprogress}&`;
            }

            if (author) {
                link += `author=${author}&`;
            }

            if (sortby) {
                link += `sort=${sortby}&`;
            } else {
                link += "sort=sortName&";
            }

            if (min) {
                link += `min=${min}&`;
            }

            if (max) {
                link += `max=${max}&`;
            }

            if (status) {
                link += `status=${status}&`;
            }

            if (readlist) {
                link += "readlist=true&";
            }

            link += `page=${pageParam}&limit=${elements}`;

            return api.get<SeriesFilter>(link);
        },
        {keepPreviousData:true}
    );

    const {data:alphabet, refetch:refetchAlphabet} = useQuery(["alphabet", variant, genre, status, author, min, max], async()=>{
        let link = `series/${variant}/alphabet?`;

        if (genre) {
            link += `genre=${genre}&`;
        }

        if (status) {
            link += `status=${status}&`;
        }

        if (author) {
            link += `author=${author}&`;
        }

        if (min) {
            link += `min=${min}&`;
        }

        if (max) {
            link += `max=${max}&`;
        }

        return api.get<Alphabet[]>(link);
    });

    useEffect(()=>{
        if (!reloaded) return;

        void refetchAlphabet();
        void refetchSeries();
    }, [refetchAlphabet, refetchSeries, reloaded]);

    function handleClick(event: React.MouseEvent<HTMLElement>):void {
        setAnchorEl(event.currentTarget);
    }

    function handleClose():void {
        setAnchorEl(null);
    }

    return (
        <div className="dark:bg-app-bg pb-4">
            <Helmet>
                <title>YomiYasu - Biblioteca</title>
            </Helmet>
            <div className="z-20 w-fill dark:bg-app-sidebar bg-app-sidebar flex items-center justify-between h-14 border-x border-0 border-solid border-app-border">
                <div className="flex items-center mx-4">
                    <Tooltip title="Volver atrás">
                        <IconButton onClick={()=>goBack(navigate)}>
                            <ArrowBack/>
                        </IconButton>
                    </Tooltip>
                    {userData?.admin && (
                        <LibrarySettings variant={variant}/>
                    )}
                </div>
                <div className="flex items-center mx-4">
                    <div className="">
                        <IconButton className="text-center" onClick={(e)=>{
                            handleClick(e);
                        }}
                        >
                            <DashboardCustomize/>
                        </IconButton>
                        <Menu id="long-menu" anchorEl={anchorEl}
                            open={Boolean(anchorEl)} onClose={handleClose} disableScrollLock={true}
                        >
                            <MenuItem selected={elements === "10"} onClick={()=>{
                                modifySiteSettings("libraryLimit", "10");
                                handleClose();
                            }}
                            >
                                10
                            </MenuItem>
                            <MenuItem selected={elements === "25"} onClick={()=>{
                                modifySiteSettings("libraryLimit", "25");
                                handleClose();
                            }}
                            >
                                25
                            </MenuItem>
                            <MenuItem selected={elements === "50"} onClick={()=>{
                                modifySiteSettings("libraryLimit", "50");
                                handleClose();
                            }}
                            >
                                50
                            </MenuItem>
                            <MenuItem selected={elements === "100"} onClick={()=>{
                                modifySiteSettings("libraryLimit", "100");
                                handleClose();
                            }}
                            >
                                100
                            </MenuItem>
                        </Menu>
                    </div>
                    <LibraryRandom variant={variant}/>
                    <LibraryFilter searchParams={searchParams} setSearchParams={setSearchParams}/>
                </div>
            </div>
            <div className="flex flex-col">
                {/* Elegir alfabeto */}
                <div className="flex w-full justify-center gap-1 flex-wrap h-12">
                    {alphabet?.map((letter)=>{
                        let textColor = "dark:text-white text-black";
                        let disabled = false;

                        if (letter.group.toUpperCase() === selectedLetter) {
                            textColor = "text-primary";
                        } else if (letter.count === 0) {
                            textColor = "dark:text-gray-700 text-gray-300";
                            disabled = true;
                        }

                        return (
                            <IconButton disabled={disabled} onClick={()=>{
                                setSelectedLetter(letter.group.toUpperCase());

                                const next = new URLSearchParams(searchParams);
                                next.delete("page");
                                setSearchParams(next);
                            }} className={`${textColor} text-sm font-semibold`} key={letter.group}
                            >
                                {letter.group.toUpperCase()}
                            </IconButton>
                        );
                    })}
                </div>

                <div className="flex flex-col overflow-y-scroll h-[calc(100svh-10.5rem)]">
                    {isLoading && (
                        <LibraryGridSkeleton count={Math.min(parseInt(elements), 25)}/>
                    )}

                    {isError && (
                        <SectionError message="No se pudo cargar la biblioteca" onRetry={()=>{
                            void refetchSeries();
                        }}/>
                    )}

                    {!isLoading && !isError && (
                        <div className="flex w-full items-center justify-center">
                            {series.data.length > 0 ? (
                                <ul className="flex flex-wrap p-8 py-4 gap-4">
                                    {series.data.map((serie)=>(
                                        <SerieComponent variant={variant} key={serie._id} serieData={serie} noVariantIndicator/>
                                    ))}
                                </ul>

                            ) : (
                                <div className="flex items-center flex-col py-8 justify-center text-center">
                                    <RestorePage className="w-40 h-40" color="primary"/>
                                    <p className="text-3xl dark:text-white">Esta biblioteca está vacía...</p>
                                </div>
                            )}
                        </div>
                    )}

                    {series.pages > 1 && (
                        <div className="sticky bottom-0 z-10 mt-auto flex items-center justify-center gap-4 py-2 border-t border-solid border-app-border bg-app-bg">
                            <Pagination onChange={(_, p)=>{
                                const next = new URLSearchParams(searchParams);
                                next.set("page", `${p}`);
                                setSearchParams(next);
                            }} page={pageParam} color="primary" count={series.pages}
                            />
                            <p className="text-sm dark:text-white">Página {pageParam} de {series.pages}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Library;