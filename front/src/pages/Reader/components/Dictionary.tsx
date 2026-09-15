import {BookMarked, CircleAlert, ExternalLink, Languages, Save} from "lucide-react";
import React, {Fragment, useEffect, useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {toast} from "react-toastify";
import {api} from "../../../api/api";
import {keys} from "../../../lib/queryKeys";
import {useSettingsStore} from "../../../stores/SettingsStore";
import {DicionaryResult} from "../../../types/dictionary";
import {HttpError} from "../../../types/error";
import {UserWord} from "../../../types/word";
import {Button} from "../../../ui/Button";
import {Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle} from "../../../ui/Dialog";
import {IconButton} from "../../../ui/IconButton";
import {Spinner} from "../../../ui/Spinner";
import {Tooltip} from "../../../ui/Tooltip";
import {cn} from "../../../ui/cn";

interface DictionaryProps {
    searchWord:string;
    setSearchWord:(v:React.SetStateAction<string>)=>void;
}

export function Dictionary(props:DictionaryProps):React.ReactElement {
    const {searchWord, setSearchWord} = props;
    const {readerSettings} = useSettingsStore();
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [hint, setHint] = useState("");

    const open = searchWord !== "" && readerSettings.nativeDictionary;

    const {data:wordDefinitions, isFetching} = useQuery({
        queryKey:keys.dictionary(readerSettings.dictionaryVersion, searchWord),
        queryFn:async()=>{
            if (searchWord === "" || searchWord === "\n") return undefined;

            try {
                const res = await api.get<DicionaryResult[]>(`dictionary/${readerSettings.dictionaryVersion === "word" ? "v1" : "v2"}/${encodeURIComponent(searchWord)}`);
                return res;
            } catch (e) {
                const error = e as HttpError;
                if (error.status === 500) {
                    setHint("El diccionario todavía no está listo.");
                    return;
                }
                setHint("El máximo de texto seleccionable es de 30 caracteres");
            }
        },
        enabled:open
    });

    useEffect(()=>{
        setSelectedIndex(0);
        setHint("");
    }, [searchWord]);

    function getWordThings(frequency:string | undefined, pitches:{position:number}[] | undefined):string {
        let text = "";

        if (pitches && pitches.length > 0) {
            pitches.forEach((pitch)=>{
                text += ` [${pitch.position}]`;
            });
        }

        if (frequency) {
            text += ` (freq: ${frequency})`;
        }

        return text;
    }

    async function saveWord(word:string, display:string, reading:string, definitions:string[], frequency:number, pitch:number[]):Promise<void> {
        const sentence = wordDefinitions?.map((x)=>x.display).join("") || "";

        const wordData:UserWord = {
            word,
            reading,
            display,
            meaning:definitions,
            frequency:frequency,
            sentence,
            pitch:pitch
        };

        try {
            const result = await api.post<UserWord, {modifiedCount:number}>("userwords", wordData);

            if (!result || result.modifiedCount === 0) {
                toast.error("Ya tienes esta palabra guardada");
                return;
            }
            toast.success("Palabra guardada correctamente");
        } catch {
            toast.error("No se ha podido guardar la palabra");
        }
    }

    return (
        <Dialog
            open={open}
            modal={false}
            onOpenChange={(value)=>{
                if (!value) setSearchWord("");
            }}
        >
            <DialogContent
                hideOverlay
                size="md"
                className="top-[18vh] max-h-[70svh] translate-y-0"
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Languages className="size-4 text-fg-muted" />
                        Diccionario
                        {isFetching ? <Spinner size={14} className="text-fg-muted" /> : null}
                    </DialogTitle>
                </DialogHeader>

                <DialogBody className="flex flex-col gap-4">
                    {wordDefinitions && wordDefinitions.length > 0 ? (
                        <>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {wordDefinitions.map((def, index)=>(
                                    <button
                                        key={`${def.display}-${index}`}
                                        type="button"
                                        onClick={()=>setSelectedIndex(index)}
                                        className={cn(
                                            "rounded-md px-2 py-1 text-sm font-semibold transition-colors",
                                            index === selectedIndex
                                                ? "bg-primary text-white"
                                                : "bg-tint text-fg-muted hover:text-fg",
                                        )}
                                    >
                                        {def.display}
                                    </button>
                                ))}
                            </div>

                            {hint ? (
                                <p className="flex items-center gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
                                    <CircleAlert className="size-3.5 shrink-0" />
                                    {hint}
                                </p>
                            ) : null}

                            {wordDefinitions[selectedIndex]?.words.length > 0 ? (
                                <ul className="flex flex-col gap-4">
                                    {wordDefinitions[selectedIndex].words.map((definition)=>(
                                        <Fragment key={definition.id}>
                                            <li className="flex items-start gap-4 border-b border-app-border pb-4 last:border-0">
                                                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                                                    <h3 className="text-lg font-semibold text-fg">
                                                        {definition.kanji.length > 0 ? definition.kanji[0].text : definition.kana[0].text}
                                                        <span className="ml-2 align-top text-xs font-normal text-fg-muted">
                                                            {getWordThings(definition.frequency, definition.pitches)}
                                                        </span>
                                                    </h3>

                                                    {definition.kanji.length > 1 ? (
                                                        <p className="text-xs text-fg-muted">
                                                            <span className="font-medium">Otras formas: </span>
                                                            {definition.kanji.map((kanji)=>kanji.text).join("、")}
                                                        </p>
                                                    ) : null}

                                                    <p className="text-xs text-fg-muted">
                                                        <span className="font-medium">Lecturas: </span>
                                                        {definition.kana.map((kana)=>kana.text).join("、")}
                                                    </p>

                                                    <ol className="mt-1 flex flex-col gap-1 text-sm text-fg">
                                                        {definition.sense[0].gloss.map((gloss, glossIndex)=>(
                                                            <li key={gloss.text} className="flex gap-2">
                                                                <span className="text-fg-muted">{glossIndex + 1}.</span>
                                                                {gloss.text}
                                                            </li>
                                                        ))}
                                                    </ol>
                                                </div>

                                                <div className="flex shrink-0 flex-col gap-1">
                                                    <Tooltip content="Guardar palabra" side="left">
                                                        <IconButton
                                                            label="Guardar palabra"
                                                            variant="solid"
                                                            size="sm"
                                                            onClick={()=>{
                                                                const word = definition.kanji.length > 0 ? definition.kanji[0].text : definition.kana[0].text;
                                                                const {display} = wordDefinitions[selectedIndex];
                                                                const reading = definition.kana[0].text;
                                                                const definitions = definition.sense[0].gloss.map((x)=>x.text);
                                                                const frequency = definition.frequency ? parseInt(definition.frequency) : 0;
                                                                const pitch = definition.pitches ? definition.pitches.map((x)=>x.position) : [];

                                                                void saveWord(word, display, reading, definitions, frequency, pitch);
                                                            }}
                                                        >
                                                            <Save />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip content="Añadir a Anki" side="left">
                                                        <IconButton
                                                            label="Añadir a Anki"
                                                            variant="solid"
                                                            size="sm"
                                                            onClick={()=>{
                                                                const word = definition.kanji.length > 0 ? encodeURIComponent(definition.kanji[0].text) : encodeURIComponent(definition.kana[0].text);
                                                                const reading = encodeURIComponent(definition.kana[0].text);
                                                                const definitions = definition.sense[0].gloss.map((x)=>x.text);

                                                                window.open(`/ankiexport?word=${word}&reading=${reading}&definition=${encodeURIComponent(definitions.join("\n"))}`,
                                                                    "YomiYasu - Exportar a Anki", "height=600,width=500,resizable=no,menubar=no,toolbar=no,location=no,status=no");
                                                            }}
                                                        >
                                                            <ExternalLink />
                                                        </IconButton>
                                                    </Tooltip>
                                                </div>
                                            </li>
                                        </Fragment>
                                    ))}
                                </ul>
                            ) : (
                                <p className="py-4 text-center text-sm text-fg-muted">
                                    Palabra no encontrada: puede ser inflexión de un verbo o una partícula
                                </p>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-2 py-8 text-center">
                            {isFetching ? (
                                <Spinner size={20} className="text-fg-muted" />
                            ) : (
                                <>
                                    <BookMarked className="size-8 text-fg-muted" />
                                    <p className="text-sm text-fg-muted">Selecciona o toca una palabra en el libro para buscarla.</p>
                                </>
                            )}
                        </div>
                    )}
                </DialogBody>

                <div className="mt-4 flex shrink-0 justify-end">
                    <Button variant="ghost" size="sm" onClick={()=>setSearchWord("")}>Cerrar</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
