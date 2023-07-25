export type ProgressStatus = "unread" | "reading" | "completed";

export interface BookWithProgress extends Book {
    lastProgress?:
    {
        startDate: Date,
        time: number,
        currentPage: number,
        status: ProgressStatus,
        endDate?: Date
    }
    , status: "reading" | "unread" | "readlist" | "completed",
    type:"book"
}

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
    summary: string,
    authors: string[],
    missing: boolean
}

export interface BookProgress {
    book:string,
    time?:number,
    currentPage:number,
    startDate?:Date,
    endDate?:Date,
    status:"unread" | "reading" | "completed"
}

export interface BooksFilter {
    data:BookWithProgress[],
    pages:number
}