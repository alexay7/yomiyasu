import {IsString} from "class-validator";
import {CreateUserDto} from "../../users/dto/create-user.dto";

export class RegisterUserDto extends CreateUserDto {
    @IsString()
    code: string;
}