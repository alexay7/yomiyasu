import {IsOptional, IsString} from "class-validator";
import {CreateUserDto} from "../../users/dto/create-user.dto";

export class RegisterUserDto extends CreateUserDto {
    /**
     * El código de invitación no es obligatorio a nivel de validación porque
     * el primer usuario (el administrador inicial) se registra sin código.
     * El controlador comprueba manualmente que exista cuando toca.
     */
    @IsOptional()
    @IsString()
    code: string;
}