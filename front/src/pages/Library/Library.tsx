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
    const page = searchParams.get("page");
    const status = searchParams.get("status");
    const readlist = searchParams.get("readlist");
    const limit = window.localStorage.getItem("limit");
    const {reloaded} = useGlobal();
    const {userData} = useAuth();
    const [selectedLetter, setSelectedLetter] = useState("ALL");
    const [currentPage, setCurrentPage] = useState(parseInt(page || "1"));
    const [elements, setElements] = useState(limit || "25");
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const navigate = useNavigate();

    const {data:series = {pages:1, data:[]}, refetch:refetchSeries, isLoading} = useQuery(["seriesData", variant, selectedLetter, currentPage, elements], async()=>{
        let link = `series/${variant}?`;

        if (selectedLetter !== "ALL") {
            if (currentPage !== 1) {
                setCurrentPage(1);
                return;
            }
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

        link += `page=${page || "1"}&limit=${elements}`;

        return api.get<SeriesFilter>(link);
    });

    const {data:alphabet, refetch:refetchAlphabet} = useQuery(["alphabet", variant], async()=>{
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
        async function refetchBooks():Promise<void> {
            await refetchAlphabet();
            await refetchSeries();
        }

        void refetchBooks();
    }, [refetchAlphabet, refetchSeries, reloaded, searchParams]);

    useEffect(()=>{
        window.localStorage.setItem("limit", elements);
    }, [elements]);

    function handleClick(event: React.MouseEvent<HTMLElement>):void {
        setAnchorEl(event.currentTarget);
    }

    function handleClose():void {
        setAnchorEl(null);
    }

    return (
        <div className="dark:bg-[#121212] pb-4">
            <Helmet>
                <title>YomiYasu - Biblioteca</title>
            </Helmet>
            <div className="z-20 w-fill dark:bg-[#212121] bg-[#f7f7f7] flex items-center justify-between h-14 border-x border-0 border-solid border-[#0000001f]">
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
                                setElements("10");
                                handleClose();
                            }}
                            >
                                10
                            </MenuItem>
                            <MenuItem selected={elements === "25"} onClick={()=>{
                                setElements("25");
                                handleClose();
                            }}
                            >
                                25
                            </MenuItem>
                            <MenuItem selected={elements === "50"} onClick={()=>{
                                setElements("50");
                                handleClose();
                            }}
                            >
                                50
                            </MenuItem>
                            <MenuItem selected={elements === "100"} onClick={()=>{
                                setElements("100");
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
                                setCurrentPage(1);
                            }} className={`${textColor} text-sm font-semibold`} key={letter.group}
                            >
                                {letter.group.toUpperCase()}
                            </IconButton>
                        );
                    })}
                </div>

                <div className="flex flex-col overflow-y-scroll h-[calc(100svh-10.5rem)]">
                    {series.pages > 1 && (
                        <div className="flex justify-center py-4">
                            <Pagination onChange={(e, p)=>{
                                setCurrentPage(p);
                                searchParams.set("page", `${p}`);
                                setSearchParams(searchParams);
                            }} page={currentPage} color="primary" count={series.pages}
                            />
                        </div>
                    )}

                    {!isLoading && (
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
                        <div className="flex justify-center">
                            <Pagination onChange={(e, p)=>{
                                setCurrentPage(p);
                                searchParams.set("page", `${p}`);
                                setSearchParams(searchParams);
                            }} page={currentPage} color="primary" count={(series || {pages:1}).pages}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Library;