import { IsBoolean, IsHexColor, IsOptional, IsString, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateWhiteLabelDto {
  @ApiPropertyOptional({ description: 'Domínio customizado (ex: eventos.empresa.com)' })
  @IsOptional()
  @IsString()
  customDomain?: string;

  @ApiPropertyOptional({ description: 'URL do logotipo' })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'Cor primária em hex (ex: #5B21B6)' })
  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @ApiPropertyOptional({ description: 'Cor de destaque em hex' })
  @IsOptional()
  @IsHexColor()
  accentColor?: string;

  @ApiPropertyOptional({ description: 'Remove o rodapé "Powered by Kora Events"' })
  @IsOptional()
  @IsBoolean()
  hidePoweredBy?: boolean;
}
