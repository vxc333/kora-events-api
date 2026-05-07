import {
  ConflictException, Injectable, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { WaitlistEntry, WaitlistStatus } from './waitlist-entry.entity';
import { Ticket } from '../tickets/ticket.entity';
import { Event } from '../events/event.entity';
import { MailService } from '../mail/mail.service';
import { JoinWaitlistDto } from './dto/join-waitlist.dto';

@Injectable()
export class WaitlistService {
  constructor(
    @InjectRepository(WaitlistEntry)
    private readonly waitlistRepo: Repository<WaitlistEntry>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    private readonly mailService: MailService,
  ) {}

  async join(eventId: string, ticketId: string, dto: JoinWaitlistDto): Promise<WaitlistEntry> {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId, eventId } });
    if (!ticket) throw new NotFoundException('Ingresso não encontrado');
    if (!ticket.waitlistEnabled) throw new UnprocessableEntityException('Lista de espera não habilitada para este ingresso');

    const existing = await this.waitlistRepo.findOne({
      where: { ticketId, email: dto.email, status: WaitlistStatus.WAITING },
    });
    if (existing) throw new ConflictException('Email já está na fila de espera para este ingresso');

    const entry = this.waitlistRepo.create({
      eventId,
      ticketId,
      name: dto.name,
      email: dto.email,
      cpf: dto.cpf ?? null,
      phone: dto.phone ?? null,
    });

    return this.waitlistRepo.save(entry);
  }

  async leave(ticketId: string, email: string): Promise<void> {
    const entry = await this.waitlistRepo.findOne({
      where: { ticketId, email, status: WaitlistStatus.WAITING },
    });
    if (!entry) throw new NotFoundException('Entrada na fila não encontrada');
    await this.waitlistRepo.remove(entry);
  }

  async listByEvent(eventId: string, userId: string): Promise<WaitlistEntry[]> {
    const event = await this.eventRepo.findOne({ where: { id: eventId, organizerId: userId } });
    if (!event) throw new NotFoundException('Evento não encontrado');

    return this.waitlistRepo.find({
      where: { eventId },
      order: { createdAt: 'ASC' },
      relations: ['ticket'],
    });
  }

  async resolveClaimToken(token: string): Promise<{
    name: string; email: string; cpf: string | null; phone: string | null;
    ticketId: string; eventSlug: string;
  }> {
    const entry = await this.waitlistRepo.findOne({
      where: { claimToken: token, status: WaitlistStatus.NOTIFIED },
      relations: ['event'],
    });

    if (!entry) throw new NotFoundException('Token inválido ou já utilizado');
    if (entry.claimExpiresAt && entry.claimExpiresAt < new Date()) {
      throw new UnprocessableEntityException('Token expirado');
    }

    return {
      name: entry.name,
      email: entry.email,
      cpf: entry.cpf,
      phone: entry.phone,
      ticketId: entry.ticketId,
      eventSlug: entry.event.slug,
    };
  }

  async validateClaimToken(token: string, ticketId: string | undefined): Promise<{ holdsSpot: boolean }> {
    const entry = await this.waitlistRepo.findOne({
      where: { claimToken: token, status: WaitlistStatus.NOTIFIED },
      relations: ['ticket'],
    });

    if (!entry) throw new UnprocessableEntityException('Token de lista de espera inválido ou expirado');
    if (entry.claimExpiresAt && entry.claimExpiresAt < new Date()) {
      throw new UnprocessableEntityException('Token de lista de espera expirado');
    }
    if (ticketId && entry.ticketId !== ticketId) {
      throw new UnprocessableEntityException('Token não pertence a este ingresso');
    }

    return { holdsSpot: entry.ticket.waitlistHoldsSpot };
  }

  async markClaimed(claimToken: string): Promise<void> {
    const entry = await this.waitlistRepo.findOne({ where: { claimToken } });
    if (entry) {
      entry.status = WaitlistStatus.CLAIMED;
      await this.waitlistRepo.save(entry);
    }
  }

  async notifyNext(ticketId: string): Promise<void> {
    const next = await this.waitlistRepo.findOne({
      where: { ticketId, status: WaitlistStatus.WAITING },
      order: { createdAt: 'ASC' },
      relations: ['event', 'ticket'],
    });

    if (!next) return;

    next.claimToken = randomUUID();
    next.claimExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    next.status = WaitlistStatus.NOTIFIED;
    await this.waitlistRepo.save(next);

    try {
      await this.mailService.sendWaitlistNotification(next, next.event, next.ticket);
    } catch { /* silently ignore */ }
  }

  async processExpired(): Promise<void> {
    const expired = await this.waitlistRepo.find({
      where: { status: WaitlistStatus.NOTIFIED, claimExpiresAt: LessThan(new Date()) },
      relations: ['ticket'],
    });

    for (const entry of expired) {
      entry.status = WaitlistStatus.EXPIRED;
      await this.waitlistRepo.save(entry);

      const hasNext = await this.waitlistRepo.findOne({
        where: { ticketId: entry.ticketId, status: WaitlistStatus.WAITING },
      });

      if (hasNext) {
        await this.notifyNext(entry.ticketId);
      } else if (entry.ticket.waitlistHoldsSpot) {
        const ticket = await this.ticketRepo.findOne({ where: { id: entry.ticketId } });
        if (ticket && ticket.quantitySold > 0) {
          ticket.quantitySold -= 1;
          await this.ticketRepo.save(ticket);
        }
      }
    }
  }
}
