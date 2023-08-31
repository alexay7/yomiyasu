import React, {Fragment, useState} from "react";
import {PopupWindow} from "../../../PopupWindow/PopupWindow";
import {Accordion, AccordionDetails, AccordionSummary, MenuItem} from "@mui/material";
import {api} from "../../../../api/api";
import {BookProgress, BookWithProgress} from "../../../../types/book";
import {useQuery} from "react-query";
import EditProgressForm from "./components/EditProgressForm";
import {ExpandMore} from "@mui/icons-material";

interface EditProgressProps {
    bookData:BookWithProgress;
    handleClose?:()=>void
}

export function EditProgress(props:EditProgressProps):React.ReactElement {
    const {bookData, handleClose} = props;
    const [open, setOpen] = useState(false);
    const [selectedProgress, setSelectedProgress] = useState("");

    const {data:progressData = [], refetch} = useQuery(`${bookData._id}-progress`, async()=>{
        if (!bookData) return;
        return api.get<BookProgress[]>(`readprogress/book/${bookData._id}`);
    });

    function closePopup():void {
        setOpen(false);
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
                Editar Progreso
            </MenuItem>
            {open && (
                <PopupWindow open={open} title={`Editar ${bookData.visibleName}`} closePopup={closePopup}>
                    {progressData?.map((progress)=>(
                        <Accordion className="flex flex-col gap-4" key={progress._id} expanded={selectedProgress === progress._id} onChange={(ev, e)=>{
                            if (e && progress._id) {
                                setSelectedProgress(progress._id);
                            } else {
                                setSelectedProgress("");
                            }
                        }}
                        >
                            <AccordionSummary expandIcon={<ExpandMore />}>
                                <p>{new Date(progress.endDate || 0).toLocaleString("es")} ({progress.status})</p>
                            </AccordionSummary>
                            <AccordionDetails>
                                <EditProgressForm progressDetails={progress} closeAccordion={()=>setSelectedProgress("")} refetch={()=>void refetch()}/>
                            </AccordionDetails>
                        </Accordion>
                    ))}
                </PopupWindow>
            )}
        </Fragment>
    );
}