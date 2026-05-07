import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventSession } from './event-session.entity';
import { SessionCheckin } from './session-checkin.entity';
import { Participant, ParticipantStatus } from '../participants/participant.entity';
import { Event } from '../events/event.entity';
import { CheckinMethod } from '../checkin/manual-checkin-log.entity';
import { CreateEventSessionDto } from './dto/create-event-session.dto';
import { UpdateEventSessionDto } from './dto/update-event-session.dto';

@Injectable()
export class EventSessionsService {
  constructor(
    @InjectRepository(EventSession)
    private readonly sessionRepo: Repository<EventSession>,
    @InjectRepository(SessionCheckin)
    private readonly sessionCheckinRepo: Repository<SessionCheckin>,
    @InjectRepository(Participant)
    private readonly participantRepo: Repository<Participant>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
  ) {}

  async create(eventId: string, organizerId: string, dto: CreateEventSessionDto): Promise<EventSession> {
    const event = await this.eventRepo.findOne({ where: { id: eventId, organizerId } });
    if (!event) throw new NotFoundException('Evento não encontrado');
    return this.sessionRepo.save(
      this.sessionRepo.create({ eventId, ...dto, location: dto.location ?? null, maxParticipants: dto.maxParticipants ?? null }),
    );
  }

  async findByEvent(eventId: string): Promise<Array<EventSession & { checkinCount: number }>> {
    const sessions = await this.sessionRepo.find({
      where: { eventId },
      order: { sessionDate: 'ASC', sessionTime: 'ASC' },
    });
    const counts = await Promise.all(
      sessions.map((s) => this.sessionCheckinRepo.count({ where: { sessionId: s.id } })),
    );
    return sessions.map((s, i) => ({ ...s, checkinCount: counts[i] }));
  }

  async update(eventId: string, sessionId: string, organizerId: string, dto: UpdateEventSessionDto): Promise<EventSession> {
    const event = await this.eventRepo.findOne({ where: { id: eventId, organizerId } });
    if (!event) throw new NotFoundException('Evento não encontrado');
    const session = await this.sessionRepo.findOne({ where: { id: sessionId, eventId } });
    if (!session) throw new NotFoundException('Sessão não encontrada');
    Object.assign(session, dto);
    return this.sessionRepo.save(session);
  }

  async remove(eventId: string, sessionId: string, organizerId: string): Promise<void> {
    const event = await this.eventRepo.findOne({ where: { id: eventId, organizerId } });
    if (!event) throw new NotFoundException('Evento não encontrado');
    const session = await this.sessionRepo.findOne({ where: { id: sessionId, eventId } });
    if (!session) throw new NotFoundException('Sessão não encontrada');
    await this.sessionRepo.remove(session);
  }

  async checkinByQr(sessionId: string, qrToken: string, operatorId: string | null = null): Promise<SessionCheckin> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Sessão não encontrada');

    const participant = await this.participantRepo.findOne({
      where: { qrToken, eventId: session.eventId, status: ParticipantStatus.CONFIRMED },
    });
    if (!participant) throw new NotFoundException('Participante não encontrado ou não confirmado');

    const existing = await this.sessionCheckinRepo.findOne({
      where: { sessionId, participantId: participant.id },
    });
    if (existing) throw new ConflictException('Participante já realizou check-in nesta sessão');

    if (session.maxParticipants !== null) {
      const count = await this.sessionCheckinRepo.count({ where: { sessionId } });
      if (count >= session.maxParticipants) {
        throw new ConflictException('Sessão atingiu o limite de participantes');
      }
    }

    return this.sessionCheckinRepo.save(
      this.sessionCheckinRepo.create({
        sessionId,
        participantId: participant.id,
        eventId: session.eventId,
        operatorId,
        method: operatorId ? CheckinMethod.MANUAL : CheckinMethod.QR,
      }),
    );
  }

  async getSessionStats(sessionId: string, organizerId: string): Promise<{ sessionId: string; checkinCount: number; maxParticipants: number | null }> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['event'],
    });
    if (!session) throw new NotFoundException('Sessão não encontrada');
    if ((session.event as Event).organizerId !== organizerId) throw new NotFoundException('Sessão não encontrada');
    const checkinCount = await this.sessionCheckinRepo.count({ where: { sessionId } });
    return { sessionId, checkinCount, maxParticipants: session.maxParticipants };
  }
}
