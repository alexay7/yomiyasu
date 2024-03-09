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
    currentBook:string;
}

export interface SerieWithProgress extends Serie {
    unreadBooks: number;
    type:"serie";
    readlist:boolean;
    paused:boolean;
    valoration:number;
}

export interface SeriesFilter {
    data:SerieWithProgress[],
    pages:number
}

export interface Alphabet {
    group:string;
    count:number;
}

export interface Review {
    _id?:string;
    difficulty:number;
    serie:string;
    name?:string;
    valoration?:number | null;
    comment?:string;
    userLevel:string;
    user?:string;
}

export interface FullSerie extends SerieWithProgress {
    books:BookWithProgress[],
    reviews:Review[]
}