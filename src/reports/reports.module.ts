import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { FinanceiroController } from './financeiro.controller';
import { MinimumAttendanceController } from './minimum-attendance.controller';
import { ReportsService } from './reports.service';
import { Event } from '../events/event.entity';
import { Participant } from '../participants/participant.entity';
import { EventSession } from '../event-sessions/event-session.entity';
import { SessionCheckin } from '../event-sessions/session-checkin.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Event, Participant, EventSession, SessionCheckin])],
  controllers: [ReportsController, FinanceiroController, MinimumAttendanceController],
  providers: [ReportsService],
})
export class ReportsModule {}
