import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EventMemberRole } from '../event-member.entity';

export class UpdateEventMemberDto {
  @ApiProperty({ enum: EventMemberRole })
  @IsEnum(EventMemberRole)
  role: EventMemberRole;
}
