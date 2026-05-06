import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Participant, ParticipantStatus } from '../participants/participant.entity';
import { Event, EventStatus } from '../events/event.entity';
import { MailService } from './mail.service';

@Injectable()
export class MailSchedulerService {
  constructor(
    @InjectRepository(Participant)
    private readonly participantRepo: Repository<Participant>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    private readonly mailService: MailService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async sendReminders(): Promise<void> {
    const now = new Date();

    const events = await this.eventRepo.find({
      where: [
        { status: EventStatus.PUBLISHED },
        { status: EventStatus.ONGOING },
      ],
    });

    for (const event of events) {
      const startDateTime = this.combineDateTime(event.startDate, event.startTime);
      const hoursDiff = (startDateTime.getTime() - now.getTime()) / 3_600_000;

      if (hoursDiff >= 23.5 && hoursDiff < 24.5) {
        await this.sendRemindersForEvent(event, 24);
      }
      if (hoursDiff >= 0.5 && hoursDiff < 1.5) {
        await this.sendRemindersForEvent(event, 1);
      }
    }
  }

  private async sendRemindersForEvent(event: Event, hours: 24 | 1): Promise<void> {
    const is24h = hours === 24;
    const where = is24h
      ? { eventId: event.id, status: ParticipantStatus.CONFIRMED, reminderSent24h: false }
      : { eventId: event.id, status: ParticipantStatus.CONFIRMED, reminderSent1h: false };

    const participants = await this.participantRepo.find({ where });

    for (const participant of participants) {
      try {
        await this.mailService.sendEventReminder(participant, event, hours);
        if (is24h) {
          participant.reminderSent24h = true;
        } else {
          participant.reminderSent1h = true;
        }
        await this.participantRepo.save(participant);
      } catch { /* silently ignore */ }
    }
  }

  private combineDateTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }
}
