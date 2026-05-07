import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { IsCpf } from '../../common/validators/is-cpf.validator';

export class FieldResponseDto {
  @IsUUID()
  @IsString()
  fieldId: string;

  @IsString()
  value: string;
}

export class RegisterParticipantDto {
  @ApiProperty({ example: 'João da Silva' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'joao@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123.456.789-00' })
  @IsString()
  @IsNotEmpty()
  @IsCpf()
  cpf: string;

  @ApiProperty({ example: '(11) 91234-5678' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ description: 'UUID do ingresso' })
  @IsOptional()
  @IsUUID()
  ticketId?: string;

  @ApiPropertyOptional({ example: 'KORA10' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({ description: 'Token de claim da lista de espera' })
  @IsOptional()
  @IsString()
  claimToken?: string;

  @ApiPropertyOptional({ type: [FieldResponseDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldResponseDto)
  responses?: FieldResponseDto[];
}
