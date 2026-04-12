import { IsString, IsOptional, IsBoolean, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSupplierDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  apiSecret?: string;

  @ApiProperty({ required: false })
  @IsUrl()
  @IsOptional()
  webhookUrl?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
