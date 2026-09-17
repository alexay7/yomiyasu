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
    /** "mokuro" (html + imágenes) o "images" (solo carpeta de imágenes). Ausente = mokuro. */
    format?: "mokuro" | "images";
    /** Nombres de las imágenes del tomo (solo tomos "images", lo devuelve el backend). */
    pagePaths?: string[];
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
