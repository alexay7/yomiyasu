export interface BookWithProgress {
    _id: string,
    path: string,
    serie: string,
    pages: number,
    visibleName: string,
    sortName: string,
    imagesFolder: string,
    thumbnailPath: string,
    createdDate: Date,
    summary: string,
    authors: string[],
    missing: boolean,
    progress?:
    {
        startDate: Date,
        time: number,
        currentPage: number,
        completed: boolean,
        endDate?: Date
    }[]
    ,
    status: "READING" | "NOT_READING" | "READLIST" | "COMPLETED"
}