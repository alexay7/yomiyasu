import React, {useState} from "react";
import {BookProgress} from "../../../../../types/book";
import {DateTimePicker} from "@mui/x-date-pickers/DateTimePicker";
import {Button, FormControl, IconButton, InputLabel, MenuItem, Select, TextField} from "@mui/material";
import dayjs, {Dayjs} from "dayjs";
import {toast} from "react-toastify";
import {api} from "../../../../../api/api";
import {Delete} from "@mui/icons-material";

interface EditProgressProps {
    progressDetails:BookProgress,
    closeAccordion:()=>void,
    modifyProgress:(id:string, progress:BookProgress)=>void,
    delProgress:(id:string)=>void
}

function EditProgressForm(props:EditProgressProps):React.ReactElement {
    const {progressDetails, closeAccordion, modifyProgress, delProgress} = props;
    const [startDate, setStartDate] = useState<Dayjs | null>(dayjs(progressDetails.startDate || null));
    const [endDate, setEndDate] = useState<Dayjs | null>(dayjs(progressDetails.endDate || null));
    const [time, setTime] = useState((progressDetails.time || 0) / 60);
    const [characters, setCharacters] = useState(progressDetails.characters || 0);
    const [pages, setPages] = useState(progressDetails.currentPage || 0);
    const [status, setStatus] = useState(progressDetails.status);

    async function saveChanges(e:React.FormEvent<HTMLFormElement>):Promise<void> {
        e.preventDefault();

        if (!startDate) {
            toast.error("Rellena todos los campos obligatorios");
            return;
        }

        const body:Partial<BookProgress> = {
            startDate:startDate.toDate(),
            endDate:endDate?.toDate(),
            characters,
            time:time * 60,
            currentPage:pages,
            status
        };

        const response = await api.patch<Partial<BookProgress>, BookProgress>(`readprogress/${progressDetails._id}`, body);
        if (response) {
            toast.success("Cambios guardados con éxito");
            modifyProgress(response._id!, response);
            closeAccordion();
        }
    }

    async function deleteProgress():Promise<void> {
        const res = await api.delete<BookProgress>(`readprogress/${progressDetails._id}`);

        if (res) {
            toast.success("Progreso borrado con éxito");
            delProgress(progressDetails._id!);
            closeAccordion();
        }
    }


    return (
        <form className="flex flex-col gap-4" onSubmit={saveChanges}>
            <FormControl fullWidth>
                <InputLabel id="progress-status">Estado</InputLabel>
                <Select required className="dark:text-white" fullWidth value={status} onChange={(e)=>{
                    setStatus(e.target.value as "reading" | "unread" | "completed");
                }} labelId="progress-status"
                >
                    <MenuItem value="completed">Completado</MenuItem>
                    <MenuItem value="reading">En progreso</MenuItem>
                </Select>
            </FormControl>
            <TextField type="number" required onChange={(e)=>setTime(parseInt(e.target.value))}
                value={time} fullWidth variant="filled" label="Tiempo en minutos"
            />
            <TextField type="number" required onChange={(e)=>setCharacters(parseInt(e.target.value))}
                value={characters} fullWidth variant="filled" label="Número de caracteres leídos"
            />
            <TextField type="number" required onChange={(e)=>setPages(parseInt(e.target.value))}
                value={pages} fullWidth variant="filled" label="Páginas leídas"
            />
            <DateTimePicker value={startDate} onChange={(value)=>{
                return setStartDate(value);
            }}
            />
            <DateTimePicker value={endDate} onChange={(value)=>{
                return setEndDate(value);
            }}
            />
            <div className="flex w-full justify-between">
                <IconButton onClick={()=>{
                    if (confirm("¿Seguro que quieres borrar el progreso?")) {
                        void deleteProgress();
                    }
                }}
                >
                    <Delete color="error"/>
                </IconButton>
                <Button type="submit">Guardar cambios</Button>
            </div>
        </form>
    );
}

export default EditProgressForm;