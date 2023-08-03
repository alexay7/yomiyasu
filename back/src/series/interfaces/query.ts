import {UpdateSeriesDto} from "../dto/update-series.dto";

export interface SeriesSearch {
    genre?:string;
    author?:string;
    name?:string;
    sort?:"createdDate" | "bookCount" | "lastModifiedDate" | "sortName" | "difficulty" | "_id";
    status?:"PUBLISHING" | "ENDED";
    limit:number;
    page:number;
    firstLetter?:string;
    min?:string;
    max?:string;
    readprogress?:"completed" | "reading" | "unread";
}

export interface UpdateSerie extends UpdateSeriesDto {
    lastModifiedDate?:Date
}