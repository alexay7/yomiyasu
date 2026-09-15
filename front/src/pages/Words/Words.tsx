import {ExternalLink, Languages, Trash2} from "lucide-react";
import React, {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {toast} from "react-toastify";
import {api} from "../../api/api";
import {invalidateWords} from "../../lib/invalidate";
import {keys} from "../../lib/queryKeys";
import {useTitle} from "../../lib/useTitle";
import {confirmDialog} from "../../stores/ConfirmStore";
import {UserWord} from "../../types/word";
import {Button} from "../../ui/Button";
import {EmptyState} from "../../ui/EmptyState";
import {ErrorState} from "../../ui/ErrorState";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "../../ui/Select";
import {Skeleton} from "../../ui/Skeleton";

function frequencyText(freq:number):string {
    if (freq < 5000) return "Muy alta";
    if (freq < 10000) return "Alta";
    if (freq < 20000) return "Media";
    if (freq < 30000) return "Baja";
    return "Muy baja";
}

export default function Words():React.ReactElement {
    const [sortBy, setSortBy] = useState<string>("new");

    useTitle("Palabras guardadas");

    const {data:words = [], isLoading, isError, refetch} = useQuery({
        queryKey:keys.words(sortBy),
        queryFn:async()=>{
            const response = await api.get<UserWord[]>(`userwords?sort=${sortBy}`);
            return response ?? [];
        },
        refetchOnWindowFocus:false
    });

    async function deleteWord(word:string):Promise<void> {
        const response = await api.delete<{modifiedCount:number}>(`userwords/${word}`);

        if (!response || response.modifiedCount === 0) {
            toast.error("No se ha podido eliminar la palabra");
        } else {
            invalidateWords();
            toast.success("Palabra eliminada correctamente");
        }
    }

    return (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 lg:px-8">
            <header className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-xl font-bold text-fg">Palabras guardadas</h1>
                <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-9 w-56 text-[13px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="new">Más nuevas primero</SelectItem>
                        <SelectItem value="!new">Más antiguas primero</SelectItem>
                        <SelectItem value="!frequency">Más frecuentes primero</SelectItem>
                        <SelectItem value="frequency">Menos frecuentes primero</SelectItem>
                    </SelectContent>
                </Select>
            </header>

            {isLoading ? (
                <ul className="flex flex-col gap-4" aria-hidden>
                    {Array.from({length:4}, (_, index)=>(
                        <li key={index}>
                            <Skeleton className="h-40 w-full rounded-xl" />
                        </li>
                    ))}
                </ul>
            ) : isError ? (
                <ErrorState title="No se pudieron cargar tus palabras" onRetry={()=>void refetch()} />
            ) : words.length === 0 ? (
                <EmptyState
                    icon={Languages}
                    title="No tienes palabras guardadas"
                    description="Puedes guardar palabras desde el diccionario nativo dentro de cualquier libro."
                />
            ) : (
                <ul className="flex flex-col gap-4">
                    {words.map((word)=>(
                        <li
                            key={word.word}
                            className="flex flex-col overflow-hidden rounded-xl border border-app-border bg-app-surface [content-visibility:auto] [contain-intrinsic-size:auto_200px] lg:flex-row"
                        >
                            <div className="flex flex-1 flex-col gap-3 px-4 py-4">
                                <div className="text-center">
                                    <ruby className="text-3xl font-semibold text-fg">
                                        {word.word}
                                        <rt className="text-xs font-normal text-fg-muted">{word.reading}</rt>
                                    </ruby>
                                </div>
                                <p className="text-center text-lg text-fg-muted">
                                    {word.sentence.split(word.display)[0]}
                                    <span className="font-semibold text-primary">{word.display}</span>
                                    {word.sentence.split(word.display)[1]}
                                </p>
                                <div className="flex flex-col gap-1 text-sm">
                                    <p className="text-fg-muted">
                                        <span className="font-medium text-fg">Frecuencia: </span>
                                        {frequencyText(word.frequency)} ({word.frequency})
                                    </p>
                                    <p className="text-fg-muted">
                                        <span className="font-medium text-fg">Significados: </span>
                                        {word.meaning.join(", ")}
                                    </p>
                                </div>
                                <p className="text-right text-[11px] text-fg-muted">
                                    Añadida: {word.createdAt ? new Date(word.createdAt).toLocaleString() : "—"}
                                </p>
                            </div>
                            <div className="flex shrink-0 flex-row gap-2 border-t border-app-border p-3 lg:w-44 lg:flex-col lg:border-l lg:border-t-0">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    fullWidth
                                    icon={<ExternalLink className="size-3.5" />}
                                    onClick={()=>{
                                        window.open(`/ankiexport?word=${encodeURIComponent(word.word)}&reading=${encodeURIComponent(word.reading)}&definition=${encodeURIComponent(word.meaning.join("\n"))}`,
                                            "YomiYasu - Exportar a Anki", "height=600,width=500,resizable=no,menubar=no,toolbar=no,location=no,status=no");
                                    }}
                                >
                                    Añadir a Anki
                                </Button>
                                <Button
                                    variant="danger"
                                    size="sm"
                                    fullWidth
                                    icon={<Trash2 className="size-3.5" />}
                                    onClick={async()=>{
                                        if (await confirmDialog(`¿Estás seguro de que quieres eliminar la palabra "${word.word}"?`)) {
                                            void deleteWord(word.word);
                                        }
                                    }}
                                >
                                    Eliminar
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
