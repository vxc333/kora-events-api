import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { FinanceiroController } from './financeiro.controller';
import { ReportsService } from './reports.service';
import { Event } from '../events/event.entity';
import { Participant } from '../participants/participant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Event, Participant])],
  controllers: [ReportsController, FinanceiroController],
  providers: [ReportsService],
})
export class ReportsModule {}
