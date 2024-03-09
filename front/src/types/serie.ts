/* eslint-disable @typescript-eslint/no-duplicate-enum-values */
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
    valoration:number;
    alternativeNames: string[];
}

export interface SerieWithProgress extends Serie {
    unreadBooks: number;
    type:"serie";
    readlist:boolean;
    paused:boolean;
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

export enum AnilistGenres {
    Action = "Acción",
    Adventure = "Aventura",
    Comedy = "Comedia",
    Drama = "Drama",
    Ecchi = "Ecchi",
    Fantasy = "Fantasía",
    Horror = "Horror",
    Hentai = "Hentai",
    "Mahou Shoujo" = "Mahou Shoujo",
    Mecha = "Mecha",
    Music = "Música",
    Mystery = "Misterio",
    Psychological = "Psicológico",
    Romance = "Romance",
    "Sci-Fi" = "Sci-Fi",
    "Slice of Life" = "Slice of Life",
    Sport = "Deporte",
    Supernatural = "Sobrenatural",
    Thriller = "Thriller"
}

export enum AnilistStatus {
    FINISHED = "ENDED",
    RELEASING = "PUBLISHING",
    NOT_YET_RELEASED = "PUBLISHING",
    CANCELLED = "ENDED",
    HIATUS = "PUBLISHING"
}

export interface AnilistSerie {
    Media:{
        description:string;
        genres: (keyof typeof AnilistGenres)[];
        staff:{
            edges:{
                role:string;
                node:{
                    name:{
                        native:string;
                        full:string;
                    }
                }
            }[]
        },
        status:"FINISHED" | "RELEASING" | "NOT_YET_RELEASED" | "CANCELLED" | "HIATUS";
        synonyms:string[];
        title:{
            romaji:string;
            english:string;
            native:string;
        }
    }
}