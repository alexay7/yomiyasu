import { IsString } from 'class-validator';
import { Types } from 'mongoose';

/**
 * Para crear el progreso solo hace falta el libro y el usuario (dado por la request)
 * El resto de datos se darán mediante updates
 */
export class CreateReadprogressDto {
  @IsString()
  book: Types.ObjectId;
}
