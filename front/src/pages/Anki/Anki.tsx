import {Check, Image} from "@mui/icons-material";
import {Button, FormControl, FormControlLabel, IconButton, InputLabel, MenuItem, Select, TextField, Tooltip} from "@mui/material";
import React, {FormEvent, useState} from "react";
import {Helmet} from "react-helmet";
import {useQuery} from "react-query";
import {useSearchParams} from "react-router-dom";
import {toast} from "react-toastify";
import {convertBase64} from "../../helpers/helpers";

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

    const ankiUrl = "http://localhost:8765";

    const {refetch} = useQuery("connect", async()=>{
        setConnect(false);
        const res = await fetch(ankiUrl);
        if (res) {
            setConnect(true);
        }
    }, {refetchOnWindowFocus:false});

    const {data:userDecks} = useQuery("decks", async()=>{
        const body = {
            action:"deckNames"
        };

        const res = await fetch(ankiUrl, {body:JSON.stringify(body), method:"POST"});
        if (res) {
            return await res.json() as string[];
        }
        return [];
    }, {refetchOnWindowFocus:false});

    const {data:modelFields} = useQuery(["fields", note], async()=>{
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
    }, {refetchOnWindowFocus:false});

    const {data:userModels} = useQuery("models", async()=>{
        const body = {
            action:"modelNames"
        };

        const res = await fetch(ankiUrl, {body:JSON.stringify(body), method:"POST"});
        if (res) {
            return await res.json() as string[];
        }
    }, {refetchOnWindowFocus:false});

    async function sendToAnki(e:FormEvent):Promise<void> {
        e.preventDefault();

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
                    "deckName": "A. 語彙::勉強",
                    "modelName": "Migaku Japanese Sentence",
                    "fields": {
                        [wordField]: word,
                        [readingField]: reading,
                        [definitionField]: definition
                    }
                }
            }
        };

        if (image && imageField !== "") {
            const imageBase64 = await convertBase64(image);
            body.params.note.picture = [{
                "data":(imageBase64 as string).split(",")[1],
                "filename": "yomiyasu.png",
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
                "filename": "yomiyasu.mp3",
                "deleteExisting":false,
                "fields": [
                    audioField
                ]
            }];
        }


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
    }

    return (
        <div className="flex w-full justify-center dark:text-white flex-col items-center py-5 overflow-x-hidden">
            <Helmet>
                <title>YomiYasu - Añadir carta a Anki</title>
            </Helmet>
            <Tooltip title="Haz click para reconectar">
                <Button className="my-2" onClick={()=>void refetch()} color={connected ? "success" : "error"}>Anki está {connected ? "conectado" : "desconectado"}</Button>
            </Tooltip>
            <form onSubmit={sendToAnki} className="flex flex-col max-w-md px-4 w-full gap-4 items-center">
                <FormControl fullWidth>
                    <InputLabel id="deck-label">Deck destino</InputLabel>
                    <Select required className="text-white" fullWidth value={deck} onChange={(e)=>setDeck(e.target.value)} labelId="deck-label">
                        {userDecks?.map((userDeck)=>(
                            <MenuItem key={userDeck} value={userDeck}>{userDeck}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControl fullWidth>
                    <InputLabel id="note-label">Tipo de nota</InputLabel>
                    <Select required className="text-white" fullWidth value={note} onChange={(e)=>setNote(e.target.value)} labelId="note-label">
                        {userModels?.map((userModel)=>(
                            <MenuItem key={userModel} value={userModel}>{userModel}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <div className="flex flex-col w-full gap-2">
                    <p>Palabra *</p>
                    <div className="flex flex-col gap-2">
                        <FormControl fullWidth>
                            <InputLabel id="word-label">Nombre del campo con la palabra</InputLabel>
                            <Select required className="text-white" fullWidth value={wordField} onChange={(e)=>setWordField(e.target.value)} labelId="word-label">
                                {modelFields?.map((modelField)=>(
                                    <MenuItem key={modelField} value={modelField}>{modelField}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField required fullWidth type="text" value={word} onChange={(e)=>setWord(e.target.value)} placeholder="Palabra"/>
                    </div>
                </div>
                <div className="flex flex-col w-full gap-2">
                    <p>Lectura de la palabra *</p>
                    <div className="flex flex-col gap-2">
                        <FormControl fullWidth>
                            <InputLabel id="reading-label">Nombre del campo con la lectura</InputLabel>
                            <Select required className="text-white" fullWidth value={readingField} onChange={(e)=>setReadingField(e.target.value)} labelId="reading-label">
                                {modelFields?.map((modelField)=>(
                                    <MenuItem key={modelField} value={modelField}>{modelField}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField required fullWidth type="text" value={reading} onChange={(e)=>setReading(e.target.value)} placeholder="Lectura"/>
                    </div>
                </div>
                <div className="flex flex-col w-full gap-2">
                    <p>Definiciones *</p>
                    <div className="flex flex-col gap-2">
                        <FormControl fullWidth>
                            <InputLabel id="definition-label">Nombre del campo con las definiciones</InputLabel>
                            <Select className="text-white" fullWidth value={definitionField} onChange={(e)=>setDefinitionField(e.target.value)} labelId="definition-label">
                                {modelFields?.map((modelField)=>(
                                    <MenuItem key={modelField} value={modelField}>{modelField}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField required multiline rows={4} fullWidth type="text" value={definition} onChange={(e)=>setDefinition(e.target.value)} placeholder="Definiciones"/>
                    </div>
                </div>
                <div className="flex flex-col w-full gap-2">
                    <p>Imagen</p>
                    <div className="flex flex-col gap-2">
                        <FormControl fullWidth>
                            <InputLabel id="image-label">Nombre del campo con la imagen</InputLabel>
                            <Select className="text-white" fullWidth value={imageField} onChange={(e)=>setImageField(e.target.value)} labelId="image-label">
                                <MenuItem value="">No añadir imagen</MenuItem>
                                {modelFields?.map((modelField)=>(
                                    <MenuItem key={modelField} value={modelField}>{modelField}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <div className="flex gap-2 items-center">
                            {image && (
                                <Check color="success"/>
                            )}
                            <FormControlLabel label="Seleccionar imagen..." control={(
                                <IconButton component="label">
                                    <Image/>
                                    <input hidden type="file" accept="image/*" onChange={(e)=>{
                                        if (e.target.files && e.target.files?.length > 0) {
                                            setImage(e.target.files[0]);
                                        }
                                    }}
                                    />
                                </IconButton>
                            )}
                            />
                        </div>
                    </div>
                </div>
                <div className="flex flex-col w-full gap-2">
                    <p>Audio</p>
                    <div className="flex flex-col gap-2">
                        <FormControl fullWidth>
                            <InputLabel id="audio-label">Nombre del campo con el audio</InputLabel>
                            <Select className="text-white" fullWidth value={audioField} onChange={(e)=>setAudioField(e.target.value)} labelId="audio-label">
                                <MenuItem value="">No añadir audio</MenuItem>
                                {modelFields?.map((modelField)=>(
                                    <MenuItem key={modelField} value={modelField}>{modelField}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <div className="flex gap-2 items-center">
                            {audio && (
                                <Check color="success"/>
                            )}
                            <FormControlLabel label="Seleccionar audio..." control={(
                                <IconButton component="label">
                                    <Image/>
                                    <input hidden type="file" accept="audio/*" onChange={(e)=>{
                                        if (e.target.files && e.target.files?.length > 0) {
                                            setAudio(e.target.files[0]);
                                        }
                                    }}
                                    />
                                </IconButton>
                            )}
                            />
                        </div>
                    </div>
                </div>
                <Button type="submit" disabled={!connected}>Crear carta</Button>
            </form>
            {!connected && (
                <p className="mx-4 text-sm">* Asegúrate de añadir {window.location.host} a la lista de hosts de confianza en la configuración de AnkiConnect.
                    Debe estar en el campo &quot;webCorsOriginList&quot;
                </p>
            )}
        </div>
    );
}

export default Anki;