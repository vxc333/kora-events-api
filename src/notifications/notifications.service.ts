import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './notification.entity';
import { Participant } from '../participants/participant.entity';
import { Event } from '../events/event.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(Participant)
    private readonly participantRepo: Repository<Participant>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
  ) {}

  async create(
    participantId: string,
    eventId: string,
    type: NotificationType,
    title: string,
    body?: string,
  ): Promise<Notification> {
    return this.notificationRepo.save(
      this.notificationRepo.create({ participantId, eventId, type, title, body: body ?? null }),
    );
  }

  async findByQrToken(qrToken: string): Promise<Notification[]> {
    const participant = await this.participantRepo.findOne({ where: { qrToken } });
    if (!participant) throw new NotFoundException('Participante não encontrado');
    return this.notificationRepo.find({
      where: { participantId: participant.id },
      order: { createdAt: 'DESC' },
    });
  }

  async findByEvent(eventId: string, organizerId: string): Promise<Notification[]> {
    const event = await this.eventRepo.findOne({ where: { id: eventId, organizerId } });
    if (!event) throw new NotFoundException('Evento não encontrado');
    return this.notificationRepo.find({
      where: { eventId },
      order: { createdAt: 'DESC' },
      relations: ['participant'],
    });
  }

  async markRead(id: string, qrToken: string): Promise<Notification> {
    const participant = await this.participantRepo.findOne({ where: { qrToken } });
    if (!participant) throw new NotFoundException('Participante não encontrado');
    const notification = await this.notificationRepo.findOne({
      where: { id, participantId: participant.id },
    });
    if (!notification) throw new NotFoundException('Notificação não encontrada');
    if (!notification.readAt) {
      notification.readAt = new Date();
      return this.notificationRepo.save(notification);
    }
    return notification;
  }

  async markAllRead(qrToken: string): Promise<{ updated: number }> {
    const participant = await this.participantRepo.findOne({ where: { qrToken } });
    if (!participant) throw new NotFoundException('Participante não encontrado');
    const result = await this.notificationRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ readAt: new Date() })
      .where('participantId = :pid AND "readAt" IS NULL', { pid: participant.id })
      .execute();
    return { updated: result.affected ?? 0 };
  }
}
