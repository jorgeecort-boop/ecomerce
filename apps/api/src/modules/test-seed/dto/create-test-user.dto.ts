import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class CreateTestUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export interface CreateTestUserResponse {
  id: string;
  email: string;
  created: boolean;
}
