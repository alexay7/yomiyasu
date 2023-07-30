import {Dialog, DialogContent, DialogTitle, Divider, MenuItem} from "@mui/material";
import React, {useState, Fragment} from "react";
import {BookWithProgress} from "../../types/book";

interface BookInfoProps {
    bookdata:BookWithProgress;
}

export function BookInfo(props:BookInfoProps):React.ReactElement {
    const {bookdata} = props;
    const [open, setOpen] = useState(false);

    return (
        <Fragment>
            <MenuItem key="info" onClick={()=>{
                setOpen(true);
            }}
            >
                Más información
            </MenuItem>
            {open && (
                <Dialog open={open} onClose={()=>setOpen(false)}>
                    <DialogTitle>Información sobre {bookdata.visibleName}</DialogTitle>
                    <Divider/>
                    <DialogContent>
                        <ul className="flex flex-col gap-2">
                            <li><span className="font-semibold">Nombre:</span> {bookdata.visibleName}</li>
                            <li><span className="font-semibold">Fecha de creación:</span> {new Date(bookdata.createdDate).toLocaleDateString()}</li>
                            {bookdata.lastModifiedDate && (
                                <li><span className="font-semibold">Fecha de publicación:</span> {new Date(bookdata.lastModifiedDate).toLocaleDateString()}</li>
                            )}
                            <li><span className="font-semibold">Caracteres:</span> {bookdata.characters} ch</li>
                            <li><span className="font-semibold">Existe?:</span> {bookdata.missing ? "No" : "Si"}</li>
                        </ul>
                    </DialogContent>
                </Dialog>
            )}
        </Fragment>
    );
}