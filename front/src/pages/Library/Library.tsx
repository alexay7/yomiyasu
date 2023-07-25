import React, {useState} from "react";
import {useQuery} from "react-query";
import {api} from "../../api/api";
import {Alphabet, SeriesFilter} from "../../types/serie";
import {SerieComponent} from "../../components/SerieComponent/SerieComponent";
import {IconButton, Pagination} from "@mui/material";

export function Library():React.ReactElement {
    const [selectedLetter, setSelectedLetter] = useState("ALL");
    const [currentPage, setCurrentPage] = useState(1);

    const {data:series = {pages:1, data:[]}} = useQuery(["seriesData", selectedLetter], async()=>{
        let link = "series?";

        if (selectedLetter !== "ALL") {
            link += `firstLetter=${selectedLetter}&`;
        }

        link += `page=${currentPage}&limit=25`;

        return api.get<SeriesFilter>(link);
    });

    const {data:alphabet} = useQuery("alphabet", async()=>{
        return api.get<Alphabet[]>("series/alphabet");
    });

    return (
        <div className="bg-[#121212] overflow-x-hidden pb-4">
            {/* Elegir alfabeto */}
            <div className="flex w-full justify-center py-4 gap-1 flex-wrap">
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

            <div className="flex justify-center">
                <Pagination onChange={(e, p)=>setCurrentPage(p)} page={currentPage} color="primary" count={series.pages}/>
            </div>

            <ul className="flex flex-wrap p-8 gap-4">
                {series && series.data.map((serie)=>(
                    <SerieComponent key={serie._id} serieData={serie}/>
                ))}
            </ul>

            <div className="flex justify-center">
                <Pagination onChange={(e, p)=>setCurrentPage(p)} page={currentPage} color="primary" count={(series || {pages:1}).pages}/>
            </div>
        </div>
    );
}