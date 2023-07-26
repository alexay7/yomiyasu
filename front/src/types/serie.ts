import {BookWithProgress} from "./book";

export interface Serie {
    _id: string;
    path: string;
    visibleName: string;
    sortName: string;
    bookCount: number;
    lastModifiedDate: Date;
    createdDate: Date;
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

export interface FullSerie extends SerieWithProgress {
    books:BookWithProgress[]
}