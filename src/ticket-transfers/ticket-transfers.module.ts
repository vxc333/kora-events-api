import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketTransfersController } from './ticket-transfers.controller';
import { TicketTransfersService } from './ticket-transfers.service';
import { TicketTransfer } from './ticket-transfer.entity';
import { Participant } from '../participants/participant.entity';
import { Event } from '../events/event.entity';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [TypeOrmModule.forFeature([TicketTransfer, Participant, Event]), MailModule],
  controllers: [TicketTransfersController],
  providers: [TicketTransfersService],
  exports: [TicketTransfersService],
})
export class TicketTransfersModule {}
