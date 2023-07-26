import {UpdateSeriesDto} from "../dto/update-series.dto";

export interface SeriesSearch {
    genre?:string;
    author?:string;
    name?:string;
    sort?:"createdDate" | "bookCount" | "lastModifiedDate" | "sortName";
    status?:"PUBLISHING" | "ENDED";
    limit:number;
    page:number;
    firstLetter?:string;
}

export interface UpdateSerie extends UpdateSeriesDto {
    lastModifiedDate:Date
}