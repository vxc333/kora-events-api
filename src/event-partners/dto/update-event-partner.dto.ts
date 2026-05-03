import { PartialType } from '@nestjs/swagger';
import { CreateEventPartnerDto } from './create-event-partner.dto';

export class UpdateEventPartnerDto extends PartialType(CreateEventPartnerDto) {}
