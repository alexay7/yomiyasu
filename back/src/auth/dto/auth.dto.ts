import {IsString, IsOptional} from "class-validator";

export class AuthDto {
  @IsString()
  usernameOrEmail: string;

  @IsString()
  password: string;

  @IsString()
  @IsOptional()
  uuid: string;
}

export class RenewTokenDto {
  @IsString()
  uuid: string;
}
