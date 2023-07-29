import {IsString} from "class-validator";
import {Types} from "mongoose";

export class CreateReadlistDto {
    @IsString()
    serie:Types.ObjectId;
}