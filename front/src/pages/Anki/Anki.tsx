import {Check, CircleAlert, Image as ImageIcon, Link2, Music, Upload} from "lucide-react";
import React, {type FormEvent, useEffect, useRef, useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {useSearchParams} from "react-router";
import {toast} from "react-toastify";
import {convertBase64} from "../../helpers/helpers";
import {keys} from "../../lib/queryKeys";
import {useTitle} from "../../lib/useTitle";
import {Badge} from "../../ui/Badge";
import {Button} from "../../ui/Button";
import {Field} from "../../ui/Field";
import {Input} from "../../ui/Input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "../../ui/Select";
import {Separator} from "../../ui/Separator";
import {Textarea} from "../../ui/Textarea";

interface AnkiAction {
    action:string,
    version:number,
    params:{
        note:{
            deckName:string,
            modelName:string,
            fields:Record<string, string>,
            picture?:Record<string, unknown>[],
            audio?:Record<string, unknown>[]
        }
    }
}

interface FieldSelectProps {
    label:string;
    value:string;
    options:string[];
    onChange:(value:string) => void;
    /** Permite la opción "No añadir" (vacío). */
    allowEmpty?:boolean;
    id:string;
}

const NONE_VALUE = "__none__";

function FieldSelect({label, value, options, onChange, allowEmpty = false, id}:FieldSelectProps):React.ReactElement {
    return (
        <Field label={label} htmlFor={id}>
            <Select
                value={allowEmpty && value === "" ? NONE_VALUE : value}
                onValueChange={(next)=>onChange(next === NONE_VALUE ? "" : next)}
            >
                <SelectTrigger id={id} className="h-9">
                    <SelectValue placeholder="Selecciona un campo" />
                </SelectTrigger>
                <SelectContent>
                    {allowEmpty ? <SelectItem value={NONE_VALUE}>No añadir</SelectItem> : null}
                    {options.map((option)=>(
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </Field>
    );
}

function FilePicker({accept, file, onSelect, label}:{accept:string; file:File | null; onSelect:(file:File) => void; label:string}):React.ReactElement {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="flex items-center gap-2">
            <Button
                variant="secondary"
                size="sm"
                icon={<Upload className="size-3.5" />}
                onClick={()=>inputRef.current?.click()}
            >
                {file ? "Cambiar archivo" : label}
            </Button>
            {file ? (
                <span className="flex min-w-0 items-center gap-1.5 text-xs text-success">
                    <Check className="size-3.5 shrink-0" />
                    <span className="truncate">{file.name}</span>
                </span>
            ) : null}
            <input
                ref={inputRef}
                hidden
                type="file"
                accept={accept}
                onChange={(e)=>{
                    if (e.target.files && e.target.files.length > 0) {
                        onSelect(e.target.files[0]);
                    }
                }}
            />
        </div>
    );
}

function Anki():React.ReactElement {
    const [deck, setDeck] = useState("");
    const [note, setNote] = useState("");

    const [searchParams] = useSearchParams();

    const [word, setWord] = useState(searchParams.get("word") || "");
    const [wordField, setWordField] = useState("");
    const [reading, setReading] = useState(searchParams.get("reading") || "");
    const [readingField, setReadingField] = useState("");
    const [definition, setDefinition] = useState(searchParams.get("definition") || "");
    const [definitionField, setDefinitionField] = useState("");
    const [image, setImage] = useState<File | null>(null);
    const [imageField, setImageField] = useState("");
    const [audio, setAudio] = useState<File | null>(null);
    const [audioField, setAudioField] = useState("");

    const [connected, setConnect] = useState(false);
    const [sending, setSending] = useState(false);

    useTitle("Añadir carta a Anki");

    const ankiUrl = "http://localhost:8765";

    const {data:userDecks, refetch:refetchDecks} = useQuery({
        queryKey:keys.ankiDecks,
        queryFn:async()=>{
            const body = {
                action:"deckNames"
            };

            const res = await fetch(ankiUrl, {body:JSON.stringify(body), method:"POST"});
            if (res) {
                return await res.json() as string[];
            }
            return [];
        },
        refetchOnWindowFocus:false
    });

    const {data:modelFields, refetch:refetchFields} = useQuery({
        queryKey:keys.ankiFields(note),
        queryFn:async()=>{
            const body = {
                action:"modelFieldNames",
                params:{
                    "modelName":note
                }
            };

            if (note !== "") {
                const res = await fetch(ankiUrl, {body:JSON.stringify(body), method:"POST"});
                if (res) {
                    return await res.json() as string[];
                }
            }
            return [];
        },
        enabled:note !== "",
        refetchOnWindowFocus:false
    });

    const {data:userModels, refetch:refetchModels} = useQuery({
        queryKey:keys.ankiModels,
        queryFn:async()=>{
            const body = {
                action:"modelNames"
            };

            const res = await fetch(ankiUrl, {body:JSON.stringify(body), method:"POST"});
            if (res) {
                return await res.json() as string[];
            }
        },
        refetchOnWindowFocus:false
    });

    async function checkConnection():Promise<void> {
        try {
            const res = await fetch(ankiUrl);
            if (res) {
                setConnect(true);
                await refetchDecks();
                await refetchModels();
                if (note !== "") {
                    await refetchFields();
                }
                return;
            }
        } catch {
            // Anki no está accesible
        }

        setConnect(false);
    }

    useEffect(()=>{
        void checkConnection();
    // Solo comprobar la conexión al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function sendToAnki(e:FormEvent):Promise<void> {
        e.preventDefault();

        if (!deck || !note || !wordField || !readingField || !definitionField) {
            toast.error("Rellena todos los campos obligatorios");
            return;
        }

        if ((audio && !audioField) || (audioField && !audio)) {
            toast.error("Debes seleccionar el campo de audio además de un archivo de audio válido");
            return;
        }

        if ((image && !imageField) || (imageField && !image)) {
            toast.error("Debes seleccionar el campo de imagen además de un archivo de imagen válido");
            return;
        }

        const body:AnkiAction = {
            action:"addNote",
            version:6,
            params:{
                note:{
                    "deckName": deck,
                    "modelName": note,
                    "fields": {
                        [wordField]: word,
                        [readingField]: reading,
                        [definitionField]: definition
                    }
                }
            }
        };

        // Nombre de archivo único por carta para no pisar medios entre notas
        const mediaSlug = (word || reading || "yomiyasu").replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 40) || "yomiyasu";

        if (image && imageField !== "") {
            const imageBase64 = await convertBase64(image);
            body.params.note.picture = [{
                "data":(imageBase64 as string).split(",")[1],
                "filename": `${mediaSlug}-${Date.now()}.png`,
                "deleteExisting":false,
                "fields": [
                    imageField
                ]
            }];
        }

        if (audio && audioField !== "") {
            const audioBase64 = await convertBase64(audio);
            body.params.note.audio = [{
                "data":(audioBase64 as string).split(",")[1],
                "filename": `${mediaSlug}-${Date.now()}.mp3`,
                "deleteExisting":false,
                "fields": [
                    audioField
                ]
            }];
        }

        setSending(true);

        try {
            const res = await fetch(ankiUrl, {body:JSON.stringify(body), method:"POST"});

            if (res) {
                const resJson = await res.json() as {result:number, error:string};

                if (resJson.result && resJson.result !== 0) {
                    toast.success("La carta se ha creado con éxito");
                    setWord("");
                    setReading("");
                    setDefinition("");
                    setImage(null);
                    setAudio(null);
                } else {
                    toast.error(`Ha ocurrido un problema creando la carta: ${resJson.error}`);
                }
            }
        } finally {
            setSending(false);
        }
    }

    const fields = modelFields ?? [];
    const noteTypeMissing = note === "";

    return (
        <div className="mx-auto flex min-h-[100svh] w-full max-w-3xl flex-col gap-6 px-4 py-6">
            <header className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-fg">Añadir carta a Anki</h1>
                    <Badge variant={connected ? "success" : "danger"}>
                        {connected ? "Conectado" : "Desconectado"}
                    </Badge>
                </div>
                <Button
                    variant="secondary"
                    size="sm"
                    icon={<Link2 className="size-3.5" />}
                    onClick={()=>void checkConnection()}
                >
                    Reconectar
                </Button>
            </header>

            {!connected ? (
                <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
                    <CircleAlert className="mt-0.5 size-4 shrink-0" />
                    <p>
                        AnkiConnect no responde. Asegúrate de tener Anki abierto con el addon AnkiConnect y de añadir{" "}
                        <span className="font-semibold">{window.location.host}</span> a la lista de hosts de confianza
                        (campo &quot;webCorsOriginList&quot;).
                    </p>
                </div>
            ) : null}

            <form onSubmit={(e)=>void sendToAnki(e)} className="flex flex-col gap-5">
                <section className="grid gap-4 sm:grid-cols-2">
                    <FieldSelect
                        id="anki-deck"
                        label="Deck destino *"
                        value={deck}
                        options={userDecks ?? []}
                        onChange={setDeck}
                    />
                    <FieldSelect
                        id="anki-note"
                        label="Tipo de nota *"
                        value={note}
                        options={userModels ?? []}
                        onChange={(value)=>{
                            setNote(value);
                            setWordField("");
                            setReadingField("");
                            setDefinitionField("");
                            setImageField("");
                            setAudioField("");
                        }}
                    />
                </section>

                <Separator />

                <section className="flex flex-col gap-3">
                    <h2 className="text-sm font-semibold text-fg">Contenido</h2>
                    {noteTypeMissing ? (
                        <p className="text-xs text-fg-muted">Selecciona primero un tipo de nota para mapear sus campos.</p>
                    ) : null}
                    <FieldSelect
                        id="anki-word-field"
                        label="Campo de la palabra *"
                        value={wordField}
                        options={fields}
                        onChange={setWordField}
                    />
                    <Field label="Palabra *" htmlFor="anki-word">
                        <Input id="anki-word" required value={word} onChange={(e)=>setWord(e.target.value)} placeholder="Palabra" />
                    </Field>
                    <FieldSelect
                        id="anki-reading-field"
                        label="Campo de la lectura *"
                        value={readingField}
                        options={fields}
                        onChange={setReadingField}
                    />
                    <Field label="Lectura *" htmlFor="anki-reading">
                        <Input id="anki-reading" required value={reading} onChange={(e)=>setReading(e.target.value)} placeholder="Lectura" />
                    </Field>
                    <FieldSelect
                        id="anki-definition-field"
                        label="Campo de las definiciones *"
                        value={definitionField}
                        options={fields}
                        onChange={setDefinitionField}
                    />
                    <Field label="Definiciones *" htmlFor="anki-definition">
                        <Textarea id="anki-definition" required rows={4} value={definition} onChange={(e)=>setDefinition(e.target.value)} placeholder="Definiciones" />
                    </Field>
                </section>

                <Separator />

                <section className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-3">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
                            <ImageIcon className="size-4 text-fg-muted" />
                            Imagen
                        </h2>
                        <FieldSelect
                            id="anki-image-field"
                            label="Campo de la imagen"
                            value={imageField}
                            options={fields}
                            onChange={setImageField}
                            allowEmpty
                        />
                        <FilePicker accept="image/*" file={image} label="Seleccionar imagen…" onSelect={setImage} />
                    </div>

                    <div className="flex flex-col gap-3">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
                            <Music className="size-4 text-fg-muted" />
                            Audio
                        </h2>
                        <FieldSelect
                            id="anki-audio-field"
                            label="Campo del audio"
                            value={audioField}
                            options={fields}
                            onChange={setAudioField}
                            allowEmpty
                        />
                        <FilePicker accept="audio/*" file={audio} label="Seleccionar audio…" onSelect={setAudio} />
                    </div>
                </section>

                <div className="flex justify-end pt-2">
                    <Button type="submit" size="lg" disabled={!connected} loading={sending}>
                        Crear carta
                    </Button>
                </div>
            </form>
        </div>
    );
}

export default Anki;
