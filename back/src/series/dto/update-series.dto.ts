import {Serie} from "../schemas/series.schema";
import {IsArray, IsOptional, IsString} from "class-validator";

export class UpdateSeriesDto implements Partial<Serie> {
    @IsString()
    @IsOptional()
    visibleName?: string;

    @IsString()
    @IsOptional()
    sortName?: string;

    @IsString()
    @IsOptional()
    status?: string;

    @IsString()
    @IsOptional()
    summary?: string;

    @IsArray()
    @IsOptional()
    genres?: string[];

    @IsArray()
    @IsOptional()
    authors?: string[];
}
