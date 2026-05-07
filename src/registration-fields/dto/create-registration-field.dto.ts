import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min,
} from 'class-validator';
import { FieldType } from '../registration-field.entity';

export class CreateRegistrationFieldDto {
  @ApiProperty({ example: 'Área de atuação' })
  @IsString()
  label: string;

  @ApiProperty({ enum: FieldType })
  @IsEnum(FieldType)
  type: FieldType;

  @ApiPropertyOptional({ description: 'null = campo do evento inteiro' })
  @IsOptional()
  @IsUUID()
  ticketId?: string;

  @ApiPropertyOptional({ example: ['Tecnologia', 'Educação', 'Saúde'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
