import { IsDateString, IsOptional, IsPositive, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEventSessionDto {
  @ApiProperty({ example: 'Módulo 1 — Introdução' })
  @IsString()
  title: string;

  @ApiProperty({ example: '2026-06-15' })
  @IsDateString()
  sessionDate: string;

  @ApiProperty({ example: '09:00' })
  @IsString()
  sessionTime: string;

  @ApiPropertyOptional({ example: 'Sala 201' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsPositive()
  maxParticipants?: number;
}
