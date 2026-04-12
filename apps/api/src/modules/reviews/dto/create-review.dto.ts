import { IsString, IsNotEmpty, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ description: 'ID del producto a reseñar' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Clasificación de 1 a 5' })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ description: 'Comentario de la reseña' })
  @IsString()
  @IsNotEmpty()
  comment: string;
}
