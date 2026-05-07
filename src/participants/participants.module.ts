import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParticipantsController } from './participants.controller';
import { ParticipantsService } from './participants.service';
import { Participant } from './participant.entity';
import { Ticket } from '../tickets/ticket.entity';
import { Coupon } from '../coupons/coupon.entity';
import { CouponUsage } from '../coupons/coupon-usage.entity';
import { Event } from '../events/event.entity';
import { MailModule } from '../mail/mail.module';
import { WaitlistModule } from '../waitlist/waitlist.module';
import { RegistrationFieldsModule } from '../registration-fields/registration-fields.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Participant, Ticket, Coupon, CouponUsage, Event]),
    MailModule,
    WaitlistModule,
    RegistrationFieldsModule,
  ],
  controllers: [ParticipantsController],
  providers: [ParticipantsService],
  exports: [ParticipantsService],
})
export class ParticipantsModule {}
