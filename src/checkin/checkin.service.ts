import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Participant, ParticipantStatus } from '../participants/participant.entity';
import { Event } from '../events/event.entity';

@Injectable()
export class CheckinService {
  constructor(
    @InjectRepository(Participant)
    private readonly participantRepo: Repository<Participant>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
  ) {}

  async checkin(token: string): Promise<Participant> {
    const participant = await this.participantRepo.findOne({ where: { qrToken: token } });
    if (!participant) throw new NotFoundException('Token de check-in inválido');

    if (participant.checkedInAt) {
      const time = participant.checkedInAt.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      throw new ConflictException(`Participante já realizou check-in às ${time}`);
    }

    participant.checkedInAt = new Date();
    return this.participantRepo.save(participant);
  }

  async getStats(
    eventId: string,
    userId: string,
  ): Promise<{ total: number; checkedIn: number; pending: number }> {
    const event = await this.eventRepo.findOne({ where: { id: eventId, organizerId: userId } });
    if (!event) throw new NotFoundException('Evento não encontrado');

    const total = await this.participantRepo.count({
      where: { eventId, status: Not(ParticipantStatus.CANCELLED) },
    });

    const checkedIn = await this.participantRepo.count({
      where: { eventId, status: Not(ParticipantStatus.CANCELLED), checkedInAt: Not(IsNull()) },
    });

    return { total, checkedIn, pending: total - checkedIn };
  }
}
