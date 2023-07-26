import React, {useState} from "react";
import {useQuery} from "react-query";
import {api} from "../../api/api";
import {Alphabet, SeriesFilter} from "../../types/serie";
import {SerieComponent} from "../../components/SerieComponent/SerieComponent";
import {IconButton, Pagination} from "@mui/material";
import {useNavigate, useSearchParams} from "react-router-dom";
import {ArrowBack, Sort} from "@mui/icons-material";
import {goBack} from "../../helpers/helpers";

export function Library():React.ReactElement {
    const [searchParams] = useSearchParams();
    const [selectedLetter, setSelectedLetter] = useState("ALL");
    const [currentPage, setCurrentPage] = useState(1);

    const navigate = useNavigate();

    const {data:series = {pages:1, data:[]}} = useQuery(["seriesData", selectedLetter], async()=>{
        const genre = searchParams.get("genre");
        const author = searchParams.get("author");
        let link = "series?";

        if (selectedLetter !== "ALL") {
            link += `firstLetter=${selectedLetter}&`;
        }

        if (genre) {
            link += `genre=${genre}&`;
        }

        if (author) {
            link += `author=${author}&`;
        }

        link += `page=${currentPage}&limit=25`;

        return api.get<SeriesFilter>(link);
    });

    const {data:alphabet} = useQuery("alphabet", async()=>{
        return api.get<Alphabet[]>("series/alphabet");
    });

    return (
        <div className="bg-[#121212] overflow-x-hidden pb-4">
            <div className="fixed z-20 w-fill bg-[#212121] py-1 flex items-center justify-between h-12">
                <div className="flex items-center mx-4">
                    <IconButton onClick={()=>goBack(navigate)}>
                        <ArrowBack/>
                    </IconButton>
                </div>
                <div className="flex items-center mx-4">
                    <IconButton>
                        <Sort/>
                    </IconButton>
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