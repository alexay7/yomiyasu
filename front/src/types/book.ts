export type ProgressStatus = "unread" | "reading" | "completed";

export type BookWithProgress = {
    lastProgress?:
    {
        startDate: Date,
        time: number,
        currentPage: number,
        status: ProgressStatus,
        endDate?: Date,
        characters?:number
    }
    , status: "reading" | "unread" | "completed",
    readlist:boolean,
    type:"book"
} & Book;

export interface Book {
    _id: string,
    path: string,
    serie: string,
    seriePath:string;
    pages: number,
    visibleName: string,
    sortName: string,
    imagesFolder: string,
    thumbnailPath: string,
    createdDate: Date,
    releaseDate?:Date,
    missing: boolean,
    lastModifiedDate:Date;
    characters?:number;
    pageChars?:number[];
    variant: "manga" | "novela";
    mokured?:boolean;
}

export interface BookProgress {
    _id?:string,
    book:string,
    time?:number,
    currentPage?:number,
    startDate?:Date,
    endDate?:Date,
    status:"unread" | "reading" | "completed",
    characters?:number
}

export interface BooksFilter {
    data:BookWithProgress[],
    pages:number
}