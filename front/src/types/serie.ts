import {BookWithProgress} from "./book";

export interface Serie {
    _id: string;
    path: string;
    visibleName: string;
    sortName: string;
    bookCount: number;
    lastModifiedDate: Date;
    createdDate: Date;
    difficulty:number;
    summary?: string;
    genres: string[];
    authors:string[];
    missing: false;
    status: string;
    thumbnailPath: string;
}

export interface SerieWithProgress extends Serie {
    unreadBooks: number;
    type:"serie";
}

export interface SeriesFilter {
    data:SerieWithProgress[],
    pages:number
}

export interface Alphabet {
    group:string;
    count:number;
}

interface Review {
    _id?:string;
    difficulty:number;
    name:string;
    valoration?:number;
    comment?:string;
    userLevel:string;
}

export interface FullSerie extends SerieWithProgress {
    books:BookWithProgress[],
    reviews:Review[]
}