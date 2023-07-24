import { IsBoolean, IsDate, IsISO8601, IsNumber, IsOptional, IsString } from 'class-validator';
import { Types } from 'mongoose';

export class DeleteReadprogressDto {
  @IsString()
  book: Types.ObjectId;
}
