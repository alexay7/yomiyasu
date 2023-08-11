import React, {Fragment, useState} from "react";
import {PopupWindow} from "../../../components/PopupWindow/PopupWindow";
import {IconButton, MenuItem, Rating, Select, TextField} from "@mui/material";
import {Review, SerieWithProgress} from "../../../types/serie";
import {toast} from "react-toastify";
import {useGlobal} from "../../../contexts/GlobalContext";
import {Add, Whatshot} from "@mui/icons-material";
import {useSearchParams} from "react-router-dom";
import {api} from "../../../api/api";

interface EditSerieProps {
    serieData:SerieWithProgress;
    handleClose?:()=>void
}

const difficultyLabels: {[index: string]: string} = {
    1: "Muy fácil para mi nivel",
    2: "Fácil para mi nivel",
    3: "Bien para mi nivel",
    4: "Difícil para mi nivel",
    5: "Muy difícil para mi nivel"
};

function getLabelText(value: number):string {
    return `${value} Star${value !== 1 ? "s" : ""}, ${difficultyLabels[value]}`;
}

export function ReviewForm(props:EditSerieProps):React.ReactElement {
    const {serieData} = props;

    const [searchParams, setSearchParams] = useSearchParams();
    const {forceReload} = useGlobal();
    const [open, setOpen] = useState(searchParams.get("finished") ? true : false);
    const [difficulty, setDifficulty] = useState<number | null>(null);
    const [rating, setRating] = useState<number | null>(null);
    const [hoverRating, setHoverRating] = useState<number>(-1);
    const [userLevel, setUserLevel] = useState(window.localStorage.getItem("userlevel") || "Principiante");
    const [comments, setComments] = useState("");

    function closePopup():void {
        setSearchParams();
        setOpen(false);
    }

    async function saveChanges(e:React.FormEvent<HTMLFormElement>):Promise<void> {
        e.preventDefault();
        if (!userLevel || !difficulty || difficulty < 1) {
            toast.error("Debes rellenar los campos obligatorios");
            return;
        }

        const review:Review = {
            serie:serieData._id,
            userLevel,
            difficulty,
            valoration:rating,
            comment:comments
        };

        const res = await api.post<Review, Review>("reviews", review);
        if (res) {
            setDifficulty(null);
            setRating(null);
            setHoverRating(-1);
            setComments("");
            toast.success("Valoración emitida con éxito");
            closePopup();
            forceReload("reviews");
            return;
        }
        toast.error("Algo salió mal");
    }

    return (
        <Fragment>
            <IconButton className="absolute top-0 right-0" onClick={()=>setOpen(true)}>
                <Add/>
            </IconButton>
            <PopupWindow open={open} title="Deja tu valoración personal" closePopup={closePopup} onSubmit={saveChanges}>
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <span className="font-semibold">¿Cuál consideras que es tu nivel de japonés? *</span>
                        <Select
                            required
                            value={userLevel}
                            onChange={(e)=>{
                                if (e.target.value) {
                                    window.localStorage.setItem("userlevel", e.target.value);
                                }
                                setUserLevel(e.target.value);
                            }}
                        >
                            <MenuItem value="Principiante">Principiante</MenuItem>
                            <MenuItem value="N5">N5</MenuItem>
                            <MenuItem value="N4">N4</MenuItem>
                            <MenuItem value="N3">N3</MenuItem>
                            <MenuItem value="N2">N2</MenuItem>
                            <MenuItem value="N1">N1</MenuItem>
                            <MenuItem value="N1+">N1+</MenuItem>
                        </Select>
                    </div>
                    <div className="flex gap-2 flex-col">
                        <span className="font-semibold">¿Qué tan difícil te ha parecido? *</span>
                        <div className="flex gap-4 items-center">
                            <Rating
                                aria-required
                                value={difficulty}
                                icon={<Whatshot color="primary"/>}
                                emptyIcon={<Whatshot/>}
                                getLabelText={getLabelText}
                                onChange={(e, v)=>{
                                    setDifficulty(v);
                                }}
                                onChangeActive={(e, v)=>{
                                    setHoverRating(v);
                                }}
                            />
                            <div>{difficultyLabels[hoverRating !== -1 ? hoverRating : difficulty || -1]}</div>
                        </div>
                    </div>
                    <div className="flex gap-2 flex-col">
                        <span className="font-semibold">¿Cuál es tu valoración personal del libro? (opcional)</span>
                        <Rating value={(rating || 0) / 2} max={5} precision={0.5} onChange={(e, v)=>setRating((v || 0) * 2)}/>
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="font-semibold">¿Tienes comentarios sobre el libro? (opcional)</span>
                        <TextField inputProps={{maxLength:500}} value={comments} onChange={(e)=>setComments(e.target.value)} multiline
                            placeholder="Máximo de 500 caracteres" rows={4}
                        />
                    </div>
                </div>
            </PopupWindow>
        </Fragment>
    );
}