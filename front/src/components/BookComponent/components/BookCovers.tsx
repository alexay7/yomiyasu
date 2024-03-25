import React, {Children, Fragment, useState} from "react";
import {PopupWindow} from "../../PopupWindow/PopupWindow";
import {Chip, MenuItem} from "@mui/material";
import {api} from "../../../api/api";
import {BookWithProgress} from "../../../types/book";
import {useQuery} from "react-query";
import {toast} from "react-toastify";

interface BookCoversProps {
    bookData:BookWithProgress;
    handleClose?:()=>void
}

interface BookImage {
    "media-type":string,
    id:string,
    href:string,
    mediaType:string
}

export function BookCovers(props:BookCoversProps):React.ReactElement {
    const {bookData, handleClose} = props;
    const [open, setOpen] = useState(false);

    const {data:bookImages = []} = useQuery(`${bookData._id}-images`, async()=>{
        if (!bookData) return;
        return api.get<BookImage[]>(`books/${bookData._id}/images`);
    }, {enabled:open});

    function closePopup():void {
        setOpen(false);
    }

    async function modifyCover(imageId:string):Promise<void> {
        const response = await api.patch(`books/${bookData._id}/cover`, {cover:imageId});

        if (response) {
            toast.success("Portada cambiada correctamente");
            closePopup();
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
                Editar Portada
            </MenuItem>
            {open && (
                <PopupWindow open={open} title={`Imágenes en ${bookData.visibleName}`} closePopup={closePopup}>
                    <ul className="flex flex-wrap gap-2">
                        {Children.toArray(bookImages.map((image)=>(
                            <button className="bg-transparent border-0 p-0" onClick={()=>{
                                void modifyCover(image.id);
                            }}
                            >
                                <Chip label={image.id} className="hover:bg-primary hover:cursor-pointer"/>
                            </button>
                        )))}
                    </ul>
                </PopupWindow>
            )}
        </Fragment>
    );
}