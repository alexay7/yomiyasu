import {IsString, IsNumber, Max, Min, IsOptional, IsEnum} from "class-validator";
import {UserLevels} from "../schemas/review.schema";

export class UpdateReviewDto {
  @IsString()
  @IsEnum(["Principiante", "N5", "N4", "N3", "N2", "N1", "N1+"])
  @IsOptional()
  userLevel?:UserLevels;

  @IsNumber()
  @Max(5)
  @Min(1)
  @IsOptional()
  difficulty?:number;

  @IsNumber()
  @Max(10)
  @Min(0)
  @IsOptional()
  valoration?:number;

  @IsString()
  @IsOptional()
  comment?:string;
}
