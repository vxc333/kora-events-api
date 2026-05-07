import { PartialType } from '@nestjs/swagger';
import { CreateRegistrationFieldDto } from './create-registration-field.dto';

export class UpdateRegistrationFieldDto extends PartialType(CreateRegistrationFieldDto) {}
