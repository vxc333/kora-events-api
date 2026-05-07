import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, IsNull, Not, Repository } from 'typeorm';
import { Participant, ParticipantStatus } from '../participants/participant.entity';
import { Event } from '../events/event.entity';
import { CheckinByCpfDto } from './dto/checkin-by-cpf.dto';
import { CheckinByNameDto } from './dto/checkin-by-name.dto';
import { ManualCheckinLog, CheckinMethod } from './manual-checkin-log.entity';
import { WebhooksService } from '../webhooks/webhooks.service';
import { WebhookEventType } from '../webhooks/webhook-endpoint.entity';

@Injectable()
export class CheckinService {
  constructor(
    @InjectRepository(Participant)
    private readonly participantRepo: Repository<Participant>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(ManualCheckinLog)
    private readonly checkinLogRepo: Repository<ManualCheckinLog>,
    private readonly webhooksService: WebhooksService,
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
    const saved = await this.participantRepo.save(participant);
    await this.checkinLogRepo.save(
      this.checkinLogRepo.create({ eventId: saved.eventId, participantId: saved.id, operatorId: null, method: CheckinMethod.QR, reason: null }),
    );
    const event = await this.eventRepo.findOne({ where: { id: saved.eventId } });
    if (event) setImmediate(() => void this.webhooksService.dispatch(event.organizerId, WebhookEventType.PARTICIPANT_CHECKED_IN, { participant: saved, method: 'QR' }));
    return saved;
  }

  async checkinByCpf(dto: CheckinByCpfDto, operatorId: string): Promise<Participant> {
    const event = await this.eventRepo.findOne({ where: { id: dto.eventId, organizerId: operatorId } });
    if (!event) throw new NotFoundException('Evento não encontrado');

    const cpfDigits = dto.cpf.replace(/\D/g, '');
    const participants = await this.participantRepo.find({
      where: [
        { eventId: dto.eventId, cpf: dto.cpf },
        { eventId: dto.eventId, cpf: cpfDigits },
        { eventId: dto.eventId, cpf: `${cpfDigits.slice(0, 3)}.${cpfDigits.slice(3, 6)}.${cpfDigits.slice(6, 9)}-${cpfDigits.slice(9)}` },
      ],
    });

    const participant = participants.find((p) => p.status !== ParticipantStatus.CANCELLED && !p.checkedInAt)
      ?? participants.find((p) => p.status !== ParticipantStatus.CANCELLED);

    if (!participant) throw new NotFoundException('Participante não encontrado com este CPF');

    if (participant.checkedInAt) {
      const time = participant.checkedInAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      throw new ConflictException(`Participante já realizou check-in às ${time}`);
    }

    participant.checkedInAt = new Date();
    const savedByCpf = await this.participantRepo.save(participant);
    await this.checkinLogRepo.save(
      this.checkinLogRepo.create({ eventId: savedByCpf.eventId, participantId: savedByCpf.id, operatorId, method: CheckinMethod.CPF, reason: null }),
    );
    return savedByCpf;
  }

  async checkinByName(dto: CheckinByNameDto, operatorId: string): Promise<Participant> {
    const event = await this.eventRepo.findOne({ where: { id: dto.eventId, organizerId: operatorId } });
    if (!event) throw new NotFoundException('Evento não encontrado');

    const matches = await this.participantRepo.find({
      where: { eventId: dto.eventId, name: ILike(`%${dto.name}%`), status: Not(ParticipantStatus.CANCELLED) },
    });

    if (matches.length === 0) throw new NotFoundException('Nenhum participante encontrado com este nome');
    if (matches.length > 1) {
      const names = matches.map((p) => p.name).join(', ');
      throw new BadRequestException(`Nome ambíguo — ${matches.length} participantes encontrados: ${names}. Seja mais específico.`);
    }

    const participant = matches[0];

    if (participant.checkedInAt) {
      const time = participant.checkedInAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      throw new ConflictException(`Participante já realizou check-in às ${time}`);
    }

    participant.checkedInAt = new Date();
    const savedByName = await this.participantRepo.save(participant);
    await this.checkinLogRepo.save(
      this.checkinLogRepo.create({ eventId: savedByName.eventId, participantId: savedByName.id, operatorId, method: CheckinMethod.NAME, reason: null }),
    );
    return savedByName;
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

  async getAuditLog(eventId: string, userId: string): Promise<ManualCheckinLog[]> {
    const event = await this.eventRepo.findOne({ where: { id: eventId, organizerId: userId } });
    if (!event) throw new NotFoundException('Evento não encontrado');
    return this.checkinLogRepo.find({
      where: { eventId },
      order: { createdAt: 'DESC' },
      relations: ['participant', 'operator'],
    });
  }
}
