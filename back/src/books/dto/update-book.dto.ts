import {IsArray, IsISO8601, IsNumber, IsOptional, IsString} from "class-validator";
import {Book} from "../schemas/book.schema";

export class UpdateBookDto implements Partial<Book> {
    @IsString()
    @IsOptional()
    visibleName?: string;

    @IsString()
    @IsOptional()
    sortName?: string;

    @IsISO8601()
    @IsOptional()
    releaseDate?: Date;

    @IsNumber()
    @IsOptional()
    characters?: number;

    @IsArray()
    @IsOptional()
    pageChars?: number[];

    @IsString()
    @IsOptional()
    ocrStatus?: "processing" | "done" | "error" | null;

    @IsNumber()
    @IsOptional()
    ocrProgress?: number;
}

export class UpdateCoverDto {
    @IsString()
    cover:string;
}