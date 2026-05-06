import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateTicketDto {
  @ApiProperty({ example: 'Ingresso Padrão' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Acesso a todas as palestras' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 0, description: '0 para gratuito' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ default: 'BRL' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 100, description: 'null = ilimitado' })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: '2026-05-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  salesStartDate?: string;

  @ApiPropertyOptional({ example: '2026-05-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  salesEndDate?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isHalfPrice?: boolean;

  @ApiPropertyOptional({ default: false, description: 'Repassa a taxa da plataforma ao comprador' })
  @IsOptional()
  @IsBoolean()
  feePassthrough?: boolean;

  @ApiPropertyOptional({ example: 'KORA10' })
  @IsOptional()
  @IsString()
  discountCode?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPercentage?: number;
}
