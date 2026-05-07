import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventSessionsController } from './event-sessions.controller';
import { EventSessionsService } from './event-sessions.service';
import { EventSession } from './event-session.entity';
import { SessionCheckin } from './session-checkin.entity';
import { Participant } from '../participants/participant.entity';
import { Event } from '../events/event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EventSession, SessionCheckin, Participant, Event])],
  controllers: [EventSessionsController],
  providers: [EventSessionsService],
  exports: [EventSessionsService],
})
export class EventSessionsModule {}
