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
import { RegisterParticipantDto } from './dto/register-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { ListParticipantsDto } from './dto/list-participants.dto';

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
  ) {}

  async register(eventId: string, dto: RegisterParticipantDto): Promise<Participant> {
    const existing = await this.participantRepo.findOne({ where: { eventId, email: dto.email } });
    if (existing) {
      throw new ConflictException({ message: 'Participante já inscrito neste evento', code: 'PARTICIPANT_ALREADY_REGISTERED' });
    }

    if (dto.ticketId) {
      const ticket = await this.ticketRepo.findOne({ where: { id: dto.ticketId, eventId } });
      if (!ticket) throw new NotFoundException('Ingresso não encontrado');

      if (ticket.quantity !== null && ticket.quantitySold >= ticket.quantity) {
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

    if (couponId) {
      await this.couponUsageRepo.save(
        this.couponUsageRepo.create({ couponId, participantId: saved.id }),
      );
    }

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
    Object.assign(participant, dto);
    return this.participantRepo.save(participant);
  }

  async cancel(eventId: string, participantId: string): Promise<Participant> {
    const participant = await this.participantRepo.findOne({ where: { id: participantId, eventId } });
    if (!participant) throw new NotFoundException('Participante não encontrado');

    if (participant.ticketId) {
      const ticket = await this.ticketRepo.findOne({ where: { id: participant.ticketId } });
      if (ticket && ticket.quantitySold > 0) {
        ticket.quantitySold -= 1;
        await this.ticketRepo.save(ticket);
      }
    }

    participant.status = ParticipantStatus.CANCELLED;
    return this.participantRepo.save(participant);
  }

  async importCsv(
    eventId: string,
    rows: Array<{ name: string; email: string; cpf?: string; ticketId?: string }>,
  ): Promise<{ imported: number; failed: Array<{ line: number; reason: string }> }> {
    let imported = 0;
    const failed: Array<{ line: number; reason: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        await this.register(eventId, {
          name: row.name,
          email: row.email,
          cpf: row.cpf,
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
}
