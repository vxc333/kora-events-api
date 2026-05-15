import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Event } from '../events/event.entity';
import { Participant } from '../participants/participant.entity';
import { BroadcastMessage } from '../broadcasts/broadcast-message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Event, Participant, BroadcastMessage])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
