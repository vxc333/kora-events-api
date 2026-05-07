import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushToken } from './push-token.entity';
import { Participant } from '../participants/participant.entity';
import { PushNotificationsService } from './push-notifications.service';
import { PushNotificationsController } from './push-notifications.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PushToken, Participant])],
  controllers: [PushNotificationsController],
  providers: [PushNotificationsService],
  exports: [PushNotificationsService],
})
export class PushNotificationsModule {}
