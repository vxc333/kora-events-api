import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RejectParticipantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
