import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckinController } from './checkin.controller';
import { CheckinService } from './checkin.service';
import { Participant } from '../participants/participant.entity';
import { Event } from '../events/event.entity';
import { ManualCheckinLog } from './manual-checkin-log.entity';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [TypeOrmModule.forFeature([Participant, Event, ManualCheckinLog]), WebhooksModule],
  controllers: [CheckinController],
  providers: [CheckinService],
})
export class CheckinModule {}
