import {IsString, IsNumber, Max, Min, IsOptional, IsEnum} from "class-validator";
import {UserLevels} from "../schemas/review.schema";
import {Types} from "mongoose";

export class CreateReviewDto {
  @IsString()
  serie: Types.ObjectId;

  @IsString()
  @IsEnum(["Principiante", "N5", "N4", "N3", "N2", "N1", "N1+"])
  userLevel:UserLevels;

  @IsNumber()
  @Max(5)
  @Min(1)
  difficulty:number;

  @IsNumber()
  @Max(10)
  @Min(0)
  @IsOptional()
  valoration:number;

  @IsString()
  @IsOptional()
  comment?:string;
}
