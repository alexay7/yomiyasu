import { IsNumber, IsString } from 'class-validator';
import { Types } from 'mongoose';

/**
 * Para actualizar el progreso solo hacen falta los propios datos
 * de progreso y el libro. El resto se obtiene de la request
 */
export class UpdateReadprogressDto {
  @IsString()
  book: Types.ObjectId;

  @IsNumber()
  time: number;

  @IsNumber()
  currentPage: number;

  @IsString()
  serie:string;
}
