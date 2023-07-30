import React, {useEffect, useState} from "react";
import {useQuery} from "react-query";
import {api} from "../../api/api";
import {Alphabet, SeriesFilter} from "../../types/serie";
import {SerieComponent} from "../../components/SerieComponent/SerieComponent";
import {IconButton, Pagination} from "@mui/material";
import {useNavigate, useSearchParams} from "react-router-dom";
import {ArrowBack} from "@mui/icons-material";
import {goBack} from "../../helpers/helpers";
import {useGlobal} from "../../contexts/GlobalContext";
import {LibrarySettings} from "./components/LibrarySettings";
import {useAuth} from "../../contexts/AuthContext";
import {LibraryFilter} from "./components/LibraryFilter";
import {Helmet} from "react-helmet";

export function Library():React.ReactElement {
    const [searchParams, setSearchParams] = useSearchParams();
    const {reloaded} = useGlobal();
    const {userData} = useAuth();
    const [selectedLetter, setSelectedLetter] = useState("ALL");
    const [currentPage, setCurrentPage] = useState(1);

    const navigate = useNavigate();

    const {data:series = {pages:1, data:[]}, refetch:refetchSeries} = useQuery(["seriesData", selectedLetter, currentPage], async()=>{
        const genre = searchParams.get("genre");
        const author = searchParams.get("author");
        const sortby = searchParams.get("sortBy");
        const min = searchParams.get("min");
        const max = searchParams.get("max");
        let link = "series?";

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

        link += `page=${currentPage}&limit=25`;

        return api.get<SeriesFilter>(link);
    }, {refetchOnWindowFocus:false});

    const {data:alphabet, refetch:refetchAlphabet} = useQuery("alphabet", async()=>{
        const genre = searchParams.get("genre");
        const author = searchParams.get("author");
        let link = "series/alphabet?";

        if (genre) {
            link += `genre=${genre}&`;
        }

        if (author) {
            link += `author=${author}&`;
        }

        return api.get<Alphabet[]>(link);
    }, {refetchOnWindowFocus:false});

    useEffect(()=>{
        async function refetchBooks():Promise<void> {
            await refetchAlphabet();
            await refetchSeries();
        }

        void refetchBooks();
    }, [refetchAlphabet, refetchSeries, reloaded, searchParams]);

    return (
        <div className="bg-[#121212] overflow-x-hidden pb-4">
            <Helmet>
                <title>YomiYasu - Biblioteca</title>
            </Helmet>
            <div className="fixed z-20 w-fill bg-[#212121] py-1 flex items-center justify-between h-12">
                <div className="flex items-center mx-4">
                    <IconButton onClick={()=>goBack(navigate)}>
                        <ArrowBack/>
                    </IconButton>
                    {userData?.admin && (
                        <LibrarySettings/>
                    )}
                </div>
                <div className="flex items-center mx-4">
                    <LibraryFilter searchParams={searchParams} setSearchParams={setSearchParams}/>
                </div>
            </div>
            {/* Elegir alfabeto */}
            <div className="flex w-full justify-center gap-1 flex-wrap pt-16">
                {alphabet?.map((letter)=>{
                    let textColor = "text-white";
                    let disabled = false;

                    if (letter.group.toUpperCase() === selectedLetter) {
                        textColor = "text-primary";
                    } else if (letter.count === 0) {
                        textColor = "text-gray-700";
                        disabled = true;
                    }

                    return (
                        <IconButton disabled={disabled} onClick={()=>setSelectedLetter(letter.group.toUpperCase())} className={`${textColor} text-sm font-semibold`} key={letter.group}>
                            {letter.group.toUpperCase()}
                        </IconButton>
                    );
                })}
            </div>

            {series.pages > 1 && (
                <div className="flex justify-center py-4">
                    <Pagination onChange={(e, p)=>setCurrentPage(p)} page={currentPage} color="primary" count={series.pages}/>
                </div>
            )}

            <ul className="flex flex-wrap p-8 py-4 gap-4">
                {series && series.data.map((serie)=>(
                    <SerieComponent key={serie._id} serieData={serie}/>
                ))}
            </ul>

            {series.pages > 1 && (
                <div className="flex justify-center">
                    <Pagination onChange={(e, p)=>setCurrentPage(p)} page={currentPage} color="primary" count={(series || {pages:1}).pages}/>
                </div>
            )}
        </div>
    );
}