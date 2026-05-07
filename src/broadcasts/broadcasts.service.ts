import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { BroadcastMessage, BroadcastSegment, BroadcastStatus } from './broadcast-message.entity';
import { Event } from '../events/event.entity';
import { Participant, ParticipantStatus } from '../participants/participant.entity';
import { MailService } from '../mail/mail.service';
import { CreateBroadcastDto } from './dto/create-broadcast.dto';

@Injectable()
export class BroadcastsService {
  constructor(
    @InjectRepository(BroadcastMessage)
    private readonly broadcastRepo: Repository<BroadcastMessage>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(Participant)
    private readonly participantRepo: Repository<Participant>,
    private readonly mailService: MailService,
  ) {}

  async send(eventId: string, userId: string, dto: CreateBroadcastDto): Promise<BroadcastMessage> {
    const event = await this.eventRepo.findOne({ where: { id: eventId, organizerId: userId } });
    if (!event) throw new NotFoundException('Evento não encontrado');

    const participants = await this.resolveSegment(eventId, dto.segment);

    const broadcast = await this.broadcastRepo.save(
      this.broadcastRepo.create({
        eventId,
        subject: dto.subject,
        htmlBody: dto.htmlBody,
        segment: dto.segment,
        status: BroadcastStatus.PENDING,
        recipientCount: participants.length,
      }),
    );

    setImmediate(() => void this.sendInBackground(broadcast.id, participants));

    return broadcast;
  }

  async findByEvent(eventId: string, userId: string): Promise<BroadcastMessage[]> {
    const event = await this.eventRepo.findOne({ where: { id: eventId, organizerId: userId } });
    if (!event) throw new NotFoundException('Evento não encontrado');

    return this.broadcastRepo.find({
      where: { eventId },
      order: { createdAt: 'DESC' },
    });
  }

  private async resolveSegment(eventId: string, segment: BroadcastSegment): Promise<Participant[]> {
    const base = { eventId };

    switch (segment) {
      case BroadcastSegment.ALL:
        return this.participantRepo.find({ where: base });
      case BroadcastSegment.CONFIRMED:
        return this.participantRepo.find({ where: { ...base, status: ParticipantStatus.CONFIRMED } });
      case BroadcastSegment.NO_CHECKIN:
        return this.participantRepo.find({
          where: { ...base, status: ParticipantStatus.CONFIRMED, checkedInAt: IsNull() },
        });
      case BroadcastSegment.PENDING:
        return this.participantRepo.find({ where: { ...base, status: ParticipantStatus.PENDING } });
    }
  }

  private async sendInBackground(broadcastId: string, participants: Participant[]): Promise<void> {
    const broadcast = await this.broadcastRepo.findOne({ where: { id: broadcastId } });
    if (!broadcast) return;

    broadcast.status = BroadcastStatus.SENDING;
    await this.broadcastRepo.save(broadcast);

    try {
      for (const participant of participants) {
        try {
          await this.mailService.sendBroadcast(
            participant.email,
            participant.name,
            broadcast.subject,
            broadcast.htmlBody,
          );
          broadcast.sentCount += 1;
        } catch {
          broadcast.failedCount += 1;
        }
      }
    } finally {
      broadcast.status = BroadcastStatus.DONE;
      await this.broadcastRepo.save(broadcast);
    }
  }
}
