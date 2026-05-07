import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventMembersController } from './event-members.controller';
import { EventMembersService } from './event-members.service';
import { EventMember } from './event-member.entity';
import { Event } from '../events/event.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EventMember, Event, User])],
  controllers: [EventMembersController],
  providers: [EventMembersService],
  exports: [EventMembersService],
})
export class EventMembersModule {}
