import React, {Fragment, useState} from "react";
import {PopupWindow} from "../PopupWindow/PopupWindow";
import {IconButton, MenuItem, TextField, Tooltip} from "@mui/material";
import {api} from "../../api/api";
import {toast} from "react-toastify";
import dayjs, {Dayjs} from "dayjs";
import {useGlobal} from "../../contexts/GlobalContext";
import {Book, BookWithProgress} from "../../types/book";
import {DatePicker} from "@mui/x-date-pickers";
import {DriveFileRenameOutline} from "@mui/icons-material";

interface EditBookProps {
    bookData:BookWithProgress;
    handleClose?:()=>void
}

export function EditBook(props:EditBookProps):React.ReactElement {
    const {bookData, handleClose} = props;
    const {forceReload} = useGlobal();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState(bookData.visibleName);
    const [sortName, setSortName] = useState(bookData.sortName);
    const [releaseDate, setReleaseDate] = useState<Dayjs | null>(dayjs(bookData.releaseDate || null));

    function closePopup():void {
        setOpen(false);
    }

    async function saveChanges(e:React.FormEvent<HTMLFormElement>):Promise<void> {
        e.preventDefault();
        if (name === "" || sortName === "") {
            toast.error("Rellena todos los campos obligatorios");
            return;
        }

        const body:Partial<Book> = {
            visibleName:name,
            sortName
        };

        if (releaseDate) {
            body.releaseDate = releaseDate.toDate();
        }

        try {
            const response = await api.patch<Partial<Book>, Book>(`books/${bookData._id}`, body);
            if (response) {
                toast.success(`Datos de ${name} actualizados con éxito`);
                closePopup();
                forceReload("all");
            }
        } catch {
            toast.error("No tienes permisos para realizar esa acción");
        }
    }

    async function getDefaultName():Promise<void> {
        const res = await api.get<{name:string}>(`books/${bookData._id}/defaultname`);
        if (res.name) {
            setName(res.name);
        }
    }

    return (
        <Fragment>
            <MenuItem key="edit" onClick={()=>{
                setOpen(true);
                if (handleClose) {
                    handleClose();
                }
            }}
            >
                Editar
            </MenuItem>
            {open && (
                <PopupWindow open={open} title={`Editar ${bookData.visibleName}`} closePopup={closePopup} onSubmit={saveChanges}>
                    <div className="flex flex-col gap-4">
                        <div className="flex gap-4">
                            <TextField required onChange={(e)=>setName(e.target.value)}
                                value={name} fullWidth variant="filled" label="Nombre"
                            />
                            <Tooltip title="Generar nombre automáticamente">
                                <IconButton onClick={getDefaultName}>
                                    <DriveFileRenameOutline/>
                                </IconButton>
                            </Tooltip>
                        </div>
                        <TextField required onChange={(e)=>setSortName(e.target.value)}
                            value={sortName} fullWidth variant="filled" label="Nombre para ordenar"
                        />
                        <DatePicker value={releaseDate} onChange={(value)=>{
                            return setReleaseDate(value);
                        }} format="DD/MM/YYYY"
                        />
                    </div>
                </PopupWindow>
            )}
        </Fragment>
    );
}