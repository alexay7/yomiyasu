import {Review} from "../../reviews/schemas/review.schema";
import {SerieProgress} from "../../serieprogress/schemas/serieprogress.schema";
import {Serie} from "../schemas/series.schema";

export interface SerieWithProgress extends Serie {
    unreadBooks:number;
    readlist:boolean;
    thumbnailPath:string;
    type?:string;
    totalCharacters?:number;
}

export interface SerieWithReviews extends Serie {
    reviews:Review[]
}

export interface FullSerie extends Serie {
    serieprogress:SerieProgress
}