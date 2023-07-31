import React, {Fragment} from "react";
import {FullSerie} from "../../../types/serie";
import {Divider, IconButton, Rating} from "@mui/material";
import {Delete, Whatshot} from "@mui/icons-material";
import {ReviewForm} from "./AddReview";
import {useAuth} from "../../../contexts/AuthContext";
import {api} from "../../../api/api";
import {toast} from "react-toastify";
import {useGlobal} from "../../../contexts/GlobalContext";

interface ReviewProps {
    serieData:FullSerie
}

export function Reviews(props:ReviewProps):React.ReactElement {
    const {serieData} = props;
    const {userData} = useAuth();
    const {forceReload} = useGlobal();

    async function deleteReview(reviewId:string):Promise<void> {
        const res = await api.delete<{status:string}>(`reviews/${reviewId}`);

        if (res) {
            toast.success("Valoración borrada con éxito");
            forceReload("reviews");
        }
    }

    return (
        <div className="border-[#212121] border-2 border-solid rounded-md p-2 bg-[#363636] text-white">
            <div className="relative flex items-center justify-center py-3">
                <p className="text-white text-center font-semibold">Valoraciones de usuarios ({serieData.reviews.length})</p>
                <ReviewForm serieData={serieData}/>
            </div>
            <Divider/>
            <ul className="py-2 max-h-[18rem] overflow-y-auto">
                {serieData.reviews.map((review)=>(
                    <Fragment key={review._id}>
                        <li className="relative flex flex-col py-2 gap-1">
                            {userData?._id === review.user && (
                                <IconButton size="small" className="absolute top-0 right-0" onClick={()=>{
                                    if (confirm("¿Seguro que quieres borrar la valoración?")) {
                                        void deleteReview(review._id || "");
                                    }
                                }}
                                >
                                    <Delete color="error"/>
                                </IconButton>
                            )}
                            <p><span className="font-semibold">Autor:</span> {review.name} <span className="text-xs align-top font-bold">{review.userLevel}</span></p>

                            <div className="flex items-center gap-2">
                                <span className="font-semibold">Dificultad:</span>
                                <Rating readOnly value={review.difficulty}
                                    icon={<Whatshot color="primary"/>}
                                    emptyIcon={<Whatshot/>}
                                />
                            </div>

                            {review.valoration && (
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold">Valoración:</span>
                                    <Rating readOnly value={review.valoration / 2} max={5} precision={0.5}/>
                                </div>
                            )}

                            {review.comment && (
                                <div className="flex rounded-md flex-col gap-2 border-dashed border border-[#212121] p-2">
                                    <span className="font-semibold">Comentario:</span>
                                    <p className="text-gray-300 text-sm">{review.comment}</p>
                                </div>
                            )}
                        </li>
                        <Divider/>
                    </Fragment>
                ))}
            </ul>
        </div>
    );
}