import { IsString, IsOptional, IsBoolean, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSupplierDto {
  @ApiProperty({ example: 'AliExpress' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'aliexpress', enum: ['aliexpress', 'cjdropshipping', 'zendrop'] })
  @IsString()
  code: string;

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
