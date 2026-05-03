import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventPartnersController } from './event-partners.controller';
import { EventPartnersService } from './event-partners.service';
import { EventPartner } from './event-partner.entity';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [TypeOrmModule.forFeature([EventPartner]), EventsModule],
  controllers: [EventPartnersController],
  providers: [EventPartnersService],
  exports: [EventPartnersService],
})
export class EventPartnersModule {}
