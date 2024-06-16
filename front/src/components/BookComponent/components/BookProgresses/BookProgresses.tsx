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
    setRead:(v:React.SetStateAction<boolean>)=>void;
}

export function EditProgress(props:EditProgressProps):React.ReactElement {
    const {bookData, handleClose, setRead} = props;
    const [open, setOpen] = useState(false);
    const [selectedProgress, setSelectedProgress] = useState("");

    const {data:progressData = []} = useQuery(`${bookData._id}-progress`, async()=>{
        if (!bookData) return;
        return api.get<BookProgress[]>(`readprogress/book/${bookData._id}`);
    }, {enabled:open});

    function closePopup():void {
        setOpen(false);
    }

    function modifyProgress(id:string, progress:BookProgress):void {
        const index = progressData.findIndex((p)=>p._id === id);
        if (index !== -1) {
            progressData[index] = progress;
        }
    }

    function deleteProgress(id:string):void {
        const index = progressData.findIndex((p)=>p._id === id);
        if (index !== -1) {
            progressData.splice(index, 1);
        }

        // If this book has no progresses, mark it as unread
        if (progressData.length === 0) {
            setRead(false);
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
                Editar Progreso
            </MenuItem>
            {open && (
                <PopupWindow open={open} title={`Editar ${bookData.visibleName}`} closePopup={closePopup}>
                    {progressData?.map((progress)=>(
                        <Accordion className="flex flex-col gap-4" key={progress._id} expanded={selectedProgress === progress._id} onChange={(_, e)=>{
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
                                <EditProgressForm progressDetails={progress} closeAccordion={()=>setSelectedProgress("")} modifyProgress={modifyProgress} delProgress={deleteProgress}/>
                            </AccordionDetails>
                        </Accordion>
                    ))}
                </PopupWindow>
            )}
        </Fragment>
    );
}