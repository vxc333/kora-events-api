import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateCertificateSignerDto {
  @ApiProperty({ example: 'Prof. Dr. João Silva' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Coordenador do Curso' })
  @IsString()
  title: string;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
