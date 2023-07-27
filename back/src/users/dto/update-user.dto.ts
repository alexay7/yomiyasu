import {IsOptional, IsString} from "class-validator";

export class UpdateUserDto {
    @IsString()
    @IsOptional()
    newUsername?:string;

    @IsString()
    @IsOptional()
    oldPassword?:string;

    @IsString()
    @IsOptional()
    newPassword?:string;
}
