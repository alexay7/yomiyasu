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