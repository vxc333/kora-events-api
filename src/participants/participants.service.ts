import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Participant, ParticipantStatus } from './participant.entity';
import { Ticket } from '../tickets/ticket.entity';
import { Coupon } from '../coupons/coupon.entity';
import { CouponUsage } from '../coupons/coupon-usage.entity';
import { Event } from '../events/event.entity';
import { RegisterParticipantDto } from './dto/register-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { ListParticipantsDto } from './dto/list-participants.dto';
import { MailService } from '../mail/mail.service';
import { WaitlistService } from '../waitlist/waitlist.service';
import { RegistrationFieldsService } from '../registration-fields/registration-fields.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';

@Injectable()
export class ParticipantsService {
  constructor(
    @InjectRepository(Participant)
    private readonly participantRepo: Repository<Participant>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Coupon)
    private readonly couponRepo: Repository<Coupon>,
    @InjectRepository(CouponUsage)
    private readonly couponUsageRepo: Repository<CouponUsage>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    private readonly mailService: MailService,
    private readonly waitlistService: WaitlistService,
    private readonly registrationFieldsService: RegistrationFieldsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async register(eventId: string, dto: RegisterParticipantDto): Promise<Participant> {
    const existing = await this.participantRepo.findOne({ where: { eventId, email: dto.email } });
    if (existing) {
      throw new ConflictException({ message: 'Participante já inscrito neste evento', code: 'PARTICIPANT_ALREADY_REGISTERED' });
    }

    let isHoldClaim = false;

    if (dto.claimToken) {
      const { holdsSpot } = await this.waitlistService.validateClaimToken(dto.claimToken, dto.ticketId);
      isHoldClaim = holdsSpot;
    }

    let ticket: Ticket | null = null;

    if (dto.ticketId) {
      ticket = await this.ticketRepo.findOne({ where: { id: dto.ticketId, eventId } });
      if (!ticket) throw new NotFoundException('Ingresso não encontrado');

      if (!isHoldClaim && ticket.quantity !== null && ticket.quantitySold >= ticket.quantity) {
        throw new HttpException(
          { message: 'Ingresso esgotado', code: 'TICKET_SOLD_OUT' },
          HttpStatus.CONFLICT,
        );
      }

      ticket.quantitySold += 1;
      await this.ticketRepo.save(ticket);
    }

    let couponId: string | null = null;

    if (dto.couponCode) {
      const coupon = await this.couponRepo.findOne({
        where: { eventId, code: dto.couponCode.toUpperCase() },
      });

      if (!coupon) throw new NotFoundException('Cupom não encontrado');

      if (!coupon.isActive) {
        throw new HttpException({ message: 'Cupom inativo', code: 'COUPON_INACTIVE' }, HttpStatus.UNPROCESSABLE_ENTITY);
      }
      if (coupon.expiresAt && new Date() > coupon.expiresAt) {
        throw new HttpException({ message: 'Cupom expirado', code: 'COUPON_EXPIRED' }, HttpStatus.UNPROCESSABLE_ENTITY);
      }
      if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
        throw new HttpException({ message: 'Cupom esgotado', code: 'COUPON_LIMIT_REACHED' }, HttpStatus.UNPROCESSABLE_ENTITY);
      }

      coupon.usedCount += 1;
      await this.couponRepo.save(coupon);
      couponId = coupon.id;
    }

    await this.registrationFieldsService.validateResponses(
      eventId,
      dto.ticketId ?? null,
      dto.responses ?? [],
    );

    const participant = this.participantRepo.create({
      eventId,
      name: dto.name,
      email: dto.email,
      cpf: dto.cpf ?? null,
      phone: dto.phone ?? null,
      ticketId: dto.ticketId ?? null,
      couponId,
      qrToken: randomUUID(),
    });

    const saved = await this.participantRepo.save(participant);

    if (dto.responses?.length) {
      await this.registrationFieldsService.saveResponses(saved.id, dto.responses);
    }

    if (dto.claimToken) {
      try { await this.waitlistService.markClaimed(dto.claimToken); } catch { /* ignore */ }
    }

    if (couponId) {
      await this.couponUsageRepo.save(
        this.couponUsageRepo.create({ couponId, participantId: saved.id }),
      );
    }

    try {
      const event = await this.eventRepo.findOne({ where: { id: eventId } });
      if (event) {
        await this.mailService.sendRegistrationConfirmation(saved, event, ticket);
        await this.notificationsService.create(saved.id, eventId, NotificationType.CONFIRMATION, `Inscrição confirmada — ${event.title}`);
      }
    } catch { /* silently ignore email errors */ }

    return saved;
  }

  async findAll(
    eventId: string,
    query: ListParticipantsDto,
  ): Promise<{ data: Participant[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, status, ticketId, search } = query;

    const where: Record<string, unknown>[] = [];
    const base: Record<string, unknown> = { eventId };
    if (status) base['status'] = status;
    if (ticketId) base['ticketId'] = ticketId;

    if (search) {
      where.push({ ...base, name: ILike(`%${search}%`) });
      where.push({ ...base, email: ILike(`%${search}%`) });
    } else {
      where.push(base);
    }

    const [data, total] = await this.participantRepo.findAndCount({
      where,
      order: { registeredAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['ticket'],
    });

    return { data, total, page, limit };
  }

  async findOne(eventId: string, participantId: string): Promise<Participant> {
    const participant = await this.participantRepo.findOne({
      where: { id: participantId, eventId },
      relations: ['ticket'],
    });
    if (!participant) throw new NotFoundException('Participante não encontrado');
    return participant;
  }

  async update(eventId: string, participantId: string, dto: UpdateParticipantDto): Promise<Participant> {
    const participant = await this.findOne(eventId, participantId);
    const wasCertReleased = participant.certificateReleased;
    Object.assign(participant, dto);
    const updated = await this.participantRepo.save(participant);

    if (dto.certificateReleased && !wasCertReleased) {
      try {
        const event = await this.eventRepo.findOne({ where: { id: updated.eventId } });
        if (event) {
          await this.mailService.sendCertificateReleased(updated, event);
          await this.notificationsService.create(updated.id, updated.eventId, NotificationType.CERTIFICATE, `Certificado disponível — ${event.title}`);
        }
      } catch { /* silently ignore email errors */ }
    }

    return updated;
  }

  async cancel(eventId: string, participantId: string): Promise<Participant> {
    const participant = await this.participantRepo.findOne({ where: { id: participantId, eventId } });
    if (!participant) throw new NotFoundException('Participante não encontrado');

    if (participant.ticketId) {
      const ticket = await this.ticketRepo.findOne({ where: { id: participant.ticketId } });
      if (ticket) {
        const shouldDecrementNow = !ticket.waitlistEnabled || !ticket.waitlistHoldsSpot;
        if (shouldDecrementNow && ticket.quantitySold > 0) {
          ticket.quantitySold -= 1;
          await this.ticketRepo.save(ticket);
        }
        if (ticket.waitlistEnabled) {
          try { await this.waitlistService.notifyNext(ticket.id); } catch { /* ignore */ }
        }
      }
    }

    participant.status = ParticipantStatus.CANCELLED;
    const cancelled = await this.participantRepo.save(participant);

    try {
      const event = await this.eventRepo.findOne({ where: { id: eventId } });
      if (event) {
        await this.mailService.sendCancellation(cancelled, event);
        await this.notificationsService.create(cancelled.id, eventId, NotificationType.CANCELLATION, `Inscrição cancelada — ${event.title}`);
      }
    } catch { /* silently ignore email errors */ }

    return cancelled;
  }

  async exportCsv(eventId: string, userId: string): Promise<string> {
    const event = await this.eventRepo.findOne({ where: { id: eventId, organizerId: userId } });
    if (!event) throw new NotFoundException('Evento não encontrado');

    const [participants, fields] = await Promise.all([
      this.participantRepo.find({
        where: { eventId },
        order: { registeredAt: 'ASC' },
        relations: ['ticket'],
      }),
      this.registrationFieldsService.findByEvent(eventId, userId),
    ]);

    const participantIds = participants.map((p) => p.id);
    const responseMap = await this.registrationFieldsService.getResponsesByParticipantIds(participantIds);

    const escape = (v: string | null | undefined) => {
      if (v == null) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const dynamicHeaders = fields.map((f) => escape(f.label));
    const header = ['Nome', 'Email', 'CPF', 'Telefone', 'Ingresso', 'Status', 'Check-in', ...dynamicHeaders].join(',');

    const rows = participants.map((p) => {
      const responses = responseMap.get(p.id) ?? new Map<string, string>();
      const dynamicCols = fields.map((f) => {
        const val = responses.get(f.id) ?? '';
        if (f.type === 'CHECKBOX') {
          try {
            const arr = JSON.parse(val) as string[];
            return escape(arr.join('|'));
          } catch { return escape(val); }
        }
        return escape(val);
      });

      return [
        escape(p.name),
        escape(p.email),
        escape(p.cpf),
        escape(p.phone),
        escape(p.ticket?.name ?? null),
        escape(p.status),
        escape(p.checkedInAt ? p.checkedInAt.toLocaleString('pt-BR') : null),
        ...dynamicCols,
      ].join(',');
    });

    return [header, ...rows].join('\n');
  }

  async importCsv(
    eventId: string,
    rows: Array<{ name: string; email: string; phone?: string; cpf?: string; ticketId?: string }>,
  ): Promise<{ imported: number; failed: Array<{ line: number; reason: string }> }> {
    let imported = 0;
    const failed: Array<{ line: number; reason: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        await this.register(eventId, {
          name: row.name,
          email: row.email,
          phone: row.phone!,
          cpf: row.cpf!,
          ticketId: row.ticketId,
        });
        imported++;
      } catch (e: unknown) {
        const reason = e instanceof Error ? e.message : 'Erro desconhecido';
        failed.push({ line: i + 2, reason });
      }
    }

    return { imported, failed };
  }

  async approve(eventId: string, participantId: string, userId: string): Promise<Participant> {
    const event = await this.eventRepo.findOne({ where: { id: eventId, organizerId: userId } });
    if (!event) throw new NotFoundException('Evento não encontrado');
    const participant = await this.findOne(eventId, participantId);
    if (participant.status !== ParticipantStatus.PENDING) {
      throw new HttpException(
        { message: 'Participante não está pendente de aprovação', code: 'PARTICIPANT_NOT_PENDING' },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    participant.status = ParticipantStatus.CONFIRMED;
    const saved = await this.participantRepo.save(participant);
    try {
      await this.mailService.sendApprovalApproved(saved, event);
      await this.notificationsService.create(saved.id, eventId, NotificationType.APPROVAL_APPROVED, `Inscrição aprovada — ${event.title}`);
    } catch { /* ignore */ }
    return saved;
  }

  async reject(eventId: string, participantId: string, userId: string, reason?: string): Promise<Participant> {
    const event = await this.eventRepo.findOne({ where: { id: eventId, organizerId: userId } });
    if (!event) throw new NotFoundException('Evento não encontrado');
    const participant = await this.findOne(eventId, participantId);
    if (participant.status !== ParticipantStatus.PENDING) {
      throw new HttpException(
        { message: 'Participante não está pendente de aprovação', code: 'PARTICIPANT_NOT_PENDING' },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    participant.status = ParticipantStatus.CANCELLED;
    const saved = await this.participantRepo.save(participant);
    try {
      await this.mailService.sendApprovalRejected(saved, event, reason);
      await this.notificationsService.create(saved.id, eventId, NotificationType.APPROVAL_REJECTED, `Inscrição não aprovada — ${event.title}`, reason);
    } catch { /* ignore */ }
    return saved;
  }

  async exportInstitutional(eventId: string, userId: string): Promise<string> {
    const event = await this.eventRepo.findOne({ where: { id: eventId, organizerId: userId } });
    if (!event) throw new NotFoundException('Evento não encontrado');
    const participants = await this.participantRepo.find({
      where: { eventId },
      order: { name: 'ASC' },
      relations: ['ticket'],
    });
    const escape = (v: string | null | undefined) => {
      if (v == null) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ['Nº Ordem', 'Nome Completo', 'CPF', 'Email', 'Telefone', 'Tipo de Ingresso', 'Situação', 'Presença Confirmada', 'Data/Hora Check-in'].join(',');
    const rows = participants.map((p, i) => [
      String(i + 1),
      escape(p.name),
      escape(p.cpf),
      escape(p.email),
      escape(p.phone),
      escape(p.ticket?.name ?? 'Gratuito'),
      escape(p.status),
      p.checkedInAt ? 'Sim' : 'Não',
      escape(p.checkedInAt ? p.checkedInAt.toLocaleString('pt-BR') : null),
    ].join(','));
    return [header, ...rows].join('\n');
  }
}
