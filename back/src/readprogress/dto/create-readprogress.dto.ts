import { IsBoolean, IsDate, IsEnum, IsISO8601, IsNumber, IsOptional, IsString } from 'class-validator';
import { Types } from 'mongoose';
import { ReadProgressStatus } from '../schemas/readprogress.schema';

/**
 * Para crear el progreso solo hace falta el libro y el usuario (dado por la request)
 * El resto de datos se darán mediante updates
 */
export class ProgressDto {
  @IsString()
  book: Types.ObjectId;

  @IsNumber()
  @IsOptional()
  time?: number;

  @IsNumber()
  @IsOptional()
  currentPage?: number;

  @IsISO8601()
  @IsOptional()
  startDate?: Date;

  @IsISO8601()
  @IsOptional()
  endDate?: Date;

  @IsString()
  @IsEnum(["unread","reading","completed"])
  status: ReadProgressStatus;
}
