import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsNotEmpty } from 'class-validator';
import { BroadcastSegment } from '../broadcast-message.entity';

export class CreateBroadcastDto {
  @ApiProperty({ example: 'Informações importantes sobre o evento' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ example: '<p>Olá! Lembramos que o evento é amanhã...</p>' })
  @IsString()
  @IsNotEmpty()
  htmlBody: string;

  @ApiProperty({ enum: BroadcastSegment })
  @IsEnum(BroadcastSegment)
  segment: BroadcastSegment;
}
