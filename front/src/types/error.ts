export class HttpError extends Error {
    public readonly status: number;
    public readonly tokenStatus:"ACCESS" | "REFRESH" | "NONE";

    public constructor(message: string, status:number, tokenStatus:"ACCESS" | "REFRESH" | "NONE") {
        super(message);
        this.status = status;
        this.tokenStatus = tokenStatus;
    }
}