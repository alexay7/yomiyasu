import {Serie} from "../schemas/series.schema";

export interface SerieWithProgress extends Serie {
    unreadBooks:number;
    readlist?:boolean;
    thumbnailPath:string;
    type?:"serie"
}