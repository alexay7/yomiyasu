import {IsBooleanString, IsNumber, IsString} from "class-validator";
import {UpdateSeriesDto} from "../dto/update-series.dto";
import {Type} from "class-transformer";
import {PartialType} from "@nestjs/mapped-types";

class SeriesSearchT {
    @IsString()
    genre?:string;
    
    @IsString()
    author?:string;

    @IsString()
    name?:string;

    @IsString()
    sort?:"createdDate" | "bookCount" | "lastModifiedDate" | "sortName" | "difficulty" | "valoration" | "_id" | "characters";

    @IsString()
    status?:"PUBLISHING" | "ENDED";

    @Type(()=>Number)
    @IsNumber()
    limit:number;

    @Type(()=>Number)
    @IsNumber()
    page:number;

    @IsString()
    firstLetter?:string;

    @Type(()=>Number)
    @IsNumber()
    min?:number;

    @Type(()=>Number)
    @IsNumber()
    max?:number;

    @Type(()=>Number)
    @IsNumber()
    valorationMin?:number;

    @Type(()=>Number)
    @IsNumber()
    valorationMax?:number;

    @Type(()=>Number)
    @IsNumber()
    valorationCount?:number;

    @IsString()
    readprogress?:"completed" | "reading" | "unread";

    @IsBooleanString()
    readlist?:boolean;
}

export class SeriesSearch extends PartialType(SeriesSearchT) {}

export interface UpdateSerie extends UpdateSeriesDto {
    lastModifiedDate?:Date
}