import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventMemberRole } from '../event-member.entity';

export class CreateEventMemberDto {
  @ApiProperty({ example: 'colaborador@email.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ enum: EventMemberRole, default: EventMemberRole.ADMIN })
  @IsOptional()
  @IsEnum(EventMemberRole)
  role?: EventMemberRole;
}
