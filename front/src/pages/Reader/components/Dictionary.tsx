import {Dialog, DialogContent, DialogTitle, Divider} from "@mui/material";
import React, {Fragment, useEffect, useState} from "react";
import {useQuery} from "react-query";
import {api} from "../../../api/api";
import {DicionaryResult} from "../../../types/dictionary";
import {toast} from "react-toastify";
import {useSettings} from "../../../contexts/SettingsContext";

interface DictionaryProps {
    searchWord:string;
    setSearchWord:(v:React.SetStateAction<string>)=>void;
}

export function Dictionary(props:DictionaryProps):React.ReactElement {
    const {searchWord, setSearchWord} = props;
    const {readerSettings} = useSettings();
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [canClose, setCanClose] = useState(false);

    const {data:wordDefinitions} = useQuery(searchWord, async()=>{
        if (searchWord === "" || searchWord === "\n") return undefined;

        try {
            const res = await api.get<DicionaryResult[]>(`dictionary/${readerSettings.dictionaryVersion === "word" ? "v1" : "v2"}/${searchWord}`);
            return res;
        } catch {
            toast.error("El máximo de texto seleccionable es de 30 caracteres");
            setSearchWord("");
        }
    });

    useEffect(()=>{
        let timeout:NodeJS.Timeout | undefined = undefined;

        setSelectedIndex(0);
        if (searchWord !== "") {
            setCanClose(false);
            timeout = setTimeout(()=>{
                setCanClose(true);
            }, 500);
        }

        return ()=>{
            if (timeout) {
                clearTimeout(timeout);
            }
        };
    }, [searchWord]);

    return (
        <Fragment>
            <Dialog className="select-none" hideBackdrop open={searchWord !== ""} onClose={(e, r)=>{
                if (r === "escapeKeyDown" || canClose) {
                    setSearchWord("");
                }
            }}
            >
                <DialogTitle>Diccionario: {wordDefinitions?.map((def, i)=>(
                    <span className={`cursor-pointer hover:font-semibold border-0 ${i === selectedIndex ? "border-b-2 border-solid border-primary font-semibold" : ""}`} key={i} onClick={()=>setSelectedIndex(i)}>{def.display}</span>
                ))}
                </DialogTitle>
                <Divider/>
                <DialogContent>
                    {wordDefinitions && wordDefinitions?.length > 0 && (
                        <div className="">
                            {wordDefinitions[selectedIndex].words.length > 0 ? (
                                <ul className="flex flex-col gap-2">
                                    {wordDefinitions[selectedIndex].words.map((definition)=>(
                                        <Fragment key={definition.id}>
                                            <li>
                                                <ul className="flex flex-col">
                                                    {definition.kanji.length > 0 ? (
                                                        <h2 className="mb-1">{definition.kanji[0].text}</h2>
                                                    ) : (
                                                        <h2 className="mb-1">{definition.kana[0].text}</h2>
                                                    )}
                                                    {definition.kanji.length > 1 && (
                                                        <li className="flex gap-2">
                                                            <p>Otras formas: </p>
                                                            <ul>
                                                                {definition.kanji.map((kanji)=>(
                                                                    <li key={kanji.text}>{kanji.text}</li>
                                                                ))}
                                                            </ul>
                                                        </li>
                                                    )}
                                                    <li className="flex gap-2">
                                                        <p>Lecturas: </p>
                                                        <ul>
                                                            {definition.kana.map((reading)=>(
                                                                <li key={reading.text}>{reading.text}</li>
                                                            ))}
                                                        </ul>
                                                    </li>
                                                    <li className="flex gap-2">
                                                        <p>Definiciones: </p>
                                                        <ul>
                                                            {definition.sense[0].gloss.map((def)=>(
                                                                <li key={def.text}>{def.text}</li>
                                                            ))}
                                                        </ul>
                                                    </li>
                                                </ul>
                                            </li>
                                            <Divider/>
                                        </Fragment>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-300">Palabra no encontrada: Posiblemente sea inflexión de un Verbo o partícula</p>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </Fragment>
    );
}