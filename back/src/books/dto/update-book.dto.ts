import {IsISO8601, IsOptional, IsString} from "class-validator";
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
}
