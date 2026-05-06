import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailService } from './mail.service';
import { MailSchedulerService } from './mail-scheduler.service';
import { Participant } from '../participants/participant.entity';
import { Event } from '../events/event.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Participant, Event]),
  ],
  providers: [MailService, MailSchedulerService],
  exports: [MailService],
})
export class MailModule {}
