import {IsString} from "class-validator";

export class CreateSeriesDto {
  @IsString()
  path: string;

  @IsString()
  name: string;
}
