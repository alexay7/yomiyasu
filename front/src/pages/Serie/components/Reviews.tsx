import React, {Fragment} from "react";
import {FullSerie} from "../../../types/serie";
import {Divider, IconButton, Rating} from "@mui/material";
import {Add, Whatshot} from "@mui/icons-material";

interface ReviewProps {
    serieData:FullSerie
}

export function Reviews(props:ReviewProps):React.ReactElement {
    const {serieData} = props;

    return (
        <div className="border-[#212121] border-2 border-solid rounded-md p-2 bg-[#363636] text-white">
            <div className="relative flex items-center justify-center py-3">
                <p className="text-white text-center font-semibold">Valoraciones de usuarios ({serieData.reviews.length})</p>
                <IconButton className="absolute top-0 right-0">
                    <Add/>
                </IconButton>
            </div>
            <Divider/>
            <ul className="py-2 h-72 overflow-y-auto">
                {serieData.reviews.map((review)=>(
                    <Fragment key={review._id}>
                        <li className="flex flex-col py-2 gap-1">
                            <p><span className="font-semibold">Autor:</span> {review.name} <span className="text-xs align-top font-bold">{review.userLevel}</span></p>

                            <div className="flex items-center gap-2">
                                <span className="font-semibold">Dificultad:</span>
                                <Rating readOnly value={review.difficulty}
                                    icon={<Whatshot color="primary"/>}
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