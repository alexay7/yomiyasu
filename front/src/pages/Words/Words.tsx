import {FormControl, InputLabel, MenuItem, Select} from "@mui/material";
import React, {Children, useState} from "react";
import {Helmet} from "react-helmet";
import {useQuery} from "react-query";
import {api} from "../../api/api";
import {UserWord} from "../../types/word";
import {toast} from "react-toastify";

export default function Words():React.ReactElement {
    const [sortBy, setSortBy] = useState<string>("new");
    const [words, setWords] = useState<UserWord[]>([]);

    useQuery(["words", sortBy], async() => {
        const response = await api.get<UserWord[]>(`userwords?sort=${sortBy}`);

        return response;
    }, {refetchOnWindowFocus:false, onSuccess:(data)=>{
        setWords(data || []);
    }
    });

    function frequencyText(freq:number):string {
        if (freq < 5000) return "Muy alta";
        if (freq < 5000) return "Alta";
        if (freq < 10000) return "Media";
        if (freq < 20000) return "Baja";
        return "Muy baja";
    }

    async function deleteWord(word:string):Promise<void> {
        const response = await api.delete<{modifiedCount:number}>(`userwords/${word}`);

        if (!response || response.modifiedCount === 0) {
            toast.error("No se ha podido eliminar la palabra");
        } else {
            setWords(words.filter((ex) => ex.word !== word));
            toast.success("Palabra eliminada correctamente");
        }
    }

    return (
        <div className="flex flex-col gap-8 overflow-y-scroll h-[calc(100svh-4rem)]">
            <Helmet>
                <title>YomiYasu - Palabras Guardadas</title>
            </Helmet>
            <div className="flex flex-col gap-4 py-4">
                <h1 className="dark:text-white px-4 pt-2 text-2xl text-center">Palabras Guardadas</h1>
                <div className="w-10/12 flex justify-center mx-auto pt-4">
                    <FormControl className="w-[300px] bg-white dark:bg-inherit">
                        <InputLabel id="sortlabel">Ordenar por...</InputLabel>
                        <Select labelId="sortlabel" value={sortBy} onChange={(e)=>{
                            setSortBy(e.target.value);
                        }}
                        >
                            <MenuItem value="new">Más nuevas primero</MenuItem>
                            <MenuItem value="!new">Más antiguas primero</MenuItem>
                            <MenuItem value="!frequency">Más frecuentes primero</MenuItem>
                            <MenuItem value="frequency">Menos frecuentes primero</MenuItem>
                        </Select>
                    </FormControl>
                </div>
                {words.length !== 0 ? (
                    <ul className="flex flex-col gap-4 w-8/12 mx-auto dark:text-white">
                        {Children.toArray(words.map((ex) => (
                            <li className="flex flex-col border border-solid dark:border-gray-400 border-gray-200 rounded-lg shadow-sm shadow-gray-400 lg:flex-row dark:bg-black dark:bg-opacity-40 bg-white">
                                <div className="flex flex-col gap-2 lg:w-4/5 py-4 px-4">
                                    <div className="flex justify-center underline">
                                        <ruby className="text-4xl">{ex.word}<rt>{ex.reading}</rt></ruby>
                                    </div>
                                    <p className="text-2xl text-center">{ex.sentence.split(ex.display)[0]}<span className="text-primary font-semibold text-3xl">{ex.display}</span>{ex.sentence.split(ex.display)[1]}</p>
                                    <div className="flex gap-2">
                                        <p className="font-semibold">Frecuencia:</p>
                                        <p>{frequencyText(ex.frequency)} ({ex.frequency})</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <p className="font-semibold">Significados:</p>
                                        <p>{ex.meaning.join(", ")}</p>
                                    </div>
                                    {/* Added date */}
                                    <div className="flex gap-2 text-xs justify-end mt-4">
                                        <p className="font-semibold">Añadida:</p>
                                        <p>{new Date(ex.createdAt!).toLocaleString()}</p>
                                    </div>
                                </div>
                                <ul className="lg:w-1/5 flex lg:flex-col justify-evenly border-0 border-t lg:border-0 lg:border-l dark:border-gray-400 border-gray-200 border-solid w-full">
                                    <MenuItem className="lg:h-1/2 w-1/2 lg:w-auto justify-center"
                                        onClick={()=>{
                                            window.open(`/ankiexport?word=${ex.word}&reading=${ex.reading}&definition=${encodeURI(ex.meaning.join("\n"))}`,
                                                "YomiYasu - Exportar a Anki", "height=600,width=500,resizable=no,menubar=no,toolbar=no,location=no,status=no");
                                        }}
                                    >Añadir a Anki
                                    </MenuItem>
                                    <MenuItem className="lg:h-1/2 bg-red-600 dark:bg-red-800 hover:bg-red-700 transition-colors rounded-br-lg w-1/2 lg:w-auto justify-center" onClick={()=>{
                                        if (confirm(`¿Estás seguro de que quieres eliminar la palabra "${ex.word}"?`)) {
                                            void deleteWord(ex.word);
                                        }
                                    }}
                                    >Eliminar
                                    </MenuItem>
                                </ul>
                            </li>
                        )))}
                    </ul>
                ) : (
                    <p className="text-center dark:text-white">No tienes palabras guardadas. <br /> <br /> Puedes guardar palabras desde el <span className="text-primary">Diccionario Nativo</span> dentro de cualquier manga</p>
                )}
            </div>
        </div>
    );
}