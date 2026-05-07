import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegisterTokenDto {
  @IsString()
  @IsNotEmpty()
  fcmToken: string;

  @IsOptional()
  @IsString()
  qrToken?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
