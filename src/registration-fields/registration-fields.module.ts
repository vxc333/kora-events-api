import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistrationField } from './registration-field.entity';
import { ParticipantResponse } from './participant-response.entity';
import { RegistrationFieldsService } from './registration-fields.service';
import { RegistrationFieldsController } from './registration-fields.controller';
import { Event } from '../events/event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RegistrationField, ParticipantResponse, Event])],
  controllers: [RegistrationFieldsController],
  providers: [RegistrationFieldsService],
  exports: [RegistrationFieldsService],
})
export class RegistrationFieldsModule {}
