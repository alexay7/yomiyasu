import {IsArray, IsNumber, IsString} from "class-validator";

export class CreateUserwordDto {
    @IsString()
    word: string;

    @IsString()
    display: string;

    @IsString()
    sentence: string;

    @IsArray()
    @IsString({each:true})
    meaning: string[];

    @IsString()
    reading: string;

    @IsNumber()
    frequency: number;

    @IsArray()
    @IsNumber({}, {each:true})
    pitch: number[];
}
