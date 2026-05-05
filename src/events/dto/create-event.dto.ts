import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { CertificateTemplate } from '../event.entity';

export class CreateEventDto {
  @ApiProperty({ example: 'Festival Tech 2026' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Maior festival de tecnologia do Brasil.' })
  @IsString()
  description: string;

  @ApiProperty({ example: '2026-06-01T00:00:00.000Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-06-02T00:00:00.000Z' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: '09:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be in HH:MM format' })
  startTime: string;

  @ApiProperty({ example: '18:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be in HH:MM format' })
  endTime: string;

  @ApiPropertyOptional({ example: 'Av. Paulista, 1000 — São Paulo, SP' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 'https://meet.google.com/abc-defg' })
  @IsOptional()
  @IsString()
  onlineLink?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @ApiPropertyOptional({ default: 75, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumAttendancePercentage?: number;

  @ApiPropertyOptional({ example: 8, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  workloadHours?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxParticipants?: number;

  @ApiPropertyOptional({ default: '#6366f1' })
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiPropertyOptional({ enum: CertificateTemplate, default: CertificateTemplate.DEFAULT })
  @IsOptional()
  @IsEnum(CertificateTemplate)
  certificateTemplate?: CertificateTemplate;

  @ApiPropertyOptional({ description: 'Blocos da landing page (page builder)' })
  @IsOptional()
  pageBlocks?: object[];

  @ApiPropertyOptional({ description: 'Configurações visuais da landing page' })
  @IsOptional()
  pageSettings?: object;
}
