import { IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InitiateTransferDto {
  @ApiProperty({ description: 'qrToken do participante que está transferindo' })
  @IsUUID()
  qrToken: string;

  @ApiProperty({ example: 'destinatario@email.com' })
  @IsEmail()
  toEmail: string;

  @ApiProperty({ example: 'João Silva' })
  @IsString()
  toName: string;

  @ApiPropertyOptional({ example: '123.456.789-09' })
  @IsOptional()
  @IsString()
  toCpf?: string;

  @ApiPropertyOptional({ example: '(11) 99999-9999' })
  @IsOptional()
  @IsString()
  toPhone?: string;
}
