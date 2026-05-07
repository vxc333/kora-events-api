import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WaitlistEntry } from './waitlist-entry.entity';
import { WaitlistService } from './waitlist.service';
import { WaitlistController } from './waitlist.controller';
import { WaitlistSchedulerService } from './waitlist-scheduler.service';
import { Ticket } from '../tickets/ticket.entity';
import { Event } from '../events/event.entity';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WaitlistEntry, Ticket, Event]),
    MailModule,
  ],
  controllers: [WaitlistController],
  providers: [WaitlistService, WaitlistSchedulerService],
  exports: [WaitlistService],
})
export class WaitlistModule {}
