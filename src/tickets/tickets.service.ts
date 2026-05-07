import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketType } from './ticket.entity';
import { User, UserPlan } from '../users/user.entity';
import { Event } from '../events/event.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
  ) {}

  private async assertPaidTicketAllowed(eventId: string, price: number | undefined): Promise<void> {
    if (!price || Number(price) <= 0) return;
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) return;
    const organizer = await this.userRepo.findOne({ where: { id: event.organizerId } });
    if (organizer && organizer.plan === UserPlan.FREE) {
      throw new ForbiddenException({
        message: 'Ingressos pagos requerem plano Pro. Faça upgrade para continuar.',
        code: 'PLAN_UPGRADE_REQUIRED',
      });
    }
  }

  async create(eventId: string, dto: CreateTicketDto): Promise<Ticket> {
    await this.assertPaidTicketAllowed(eventId, dto.price);
    this.validateEarlyBird(dto.ticketType, dto.salesEndDate);

    const ticket = this.ticketRepo.create({
      ...dto,
      eventId,
      ...(dto.salesStartDate ? { salesStartDate: new Date(dto.salesStartDate) } : {}),
      ...(dto.salesEndDate ? { salesEndDate: new Date(dto.salesEndDate) } : {}),
    });

    return this.ticketRepo.save(ticket);
  }

  async findByEvent(eventId: string): Promise<Ticket[]> {
    return this.ticketRepo.find({ where: { eventId }, order: { createdAt: 'ASC' } });
  }

  async findAvailable(
    eventId: string,
  ): Promise<Array<Ticket & { isSoldOut: boolean; isOnSale: boolean; effectivePrice: number }>> {
    const now = new Date();
    const tickets = await this.ticketRepo.find({
      where: { eventId, isActive: true },
      order: { createdAt: 'ASC' },
    });

    return tickets.map((t) => ({
      ...t,
      isSoldOut: this.isSoldOut(t),
      isOnSale: this.isOnSale(t, now),
      effectivePrice: this.getEffectivePrice(t),
    }));
  }

  private isSoldOut(ticket: Ticket): boolean {
    return ticket.quantity !== null && ticket.quantitySold >= ticket.quantity;
  }

  private isOnSale(ticket: Ticket, now: Date): boolean {
    if (ticket.salesStartDate && now < ticket.salesStartDate) return false;
    if (ticket.salesEndDate && now > ticket.salesEndDate) return false;
    return true;
  }

  private getEffectivePrice(ticket: Ticket): number {
    const base = Number(ticket.price);
    const afterHalf = ticket.isHalfPrice ? base * 0.5 : base;
    if (ticket.feePassthrough && afterHalf > 0) {
      return afterHalf + afterHalf * 0.05 + 0.99;
    }
    return afterHalf;
  }

  private async findTicketForEvent(eventId: string, ticketId: string): Promise<Ticket> {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId, eventId },
    });
    if (!ticket) throw new NotFoundException('Ingresso não encontrado');
    return ticket;
  }

  async update(eventId: string, ticketId: string, dto: UpdateTicketDto): Promise<Ticket> {
    await this.assertPaidTicketAllowed(eventId, dto.price);
    const ticket = await this.findTicketForEvent(eventId, ticketId);
    const resolvedType = dto.ticketType ?? ticket.ticketType;
    const resolvedEnd  = dto.salesEndDate !== undefined ? dto.salesEndDate : ticket.salesEndDate?.toISOString();
    this.validateEarlyBird(resolvedType, resolvedEnd);
    const updated = Object.assign(ticket, {
      ...dto,
      ...(dto.salesStartDate ? { salesStartDate: new Date(dto.salesStartDate) } : {}),
      ...(dto.salesEndDate ? { salesEndDate: new Date(dto.salesEndDate) } : {}),
    });
    return this.ticketRepo.save(updated);
  }

  async remove(eventId: string, ticketId: string): Promise<void> {
    const ticket = await this.findTicketForEvent(eventId, ticketId);
    if (ticket.quantitySold > 0) {
      throw new BadRequestException(
        'Não é possível remover um ingresso que já possui vendas. Desative-o em vez disso.',
      );
    }
    await this.ticketRepo.remove(ticket);
  }

  private validateEarlyBird(
    ticketType: TicketType | undefined,
    salesEndDate: string | Date | null | undefined,
  ): void {
    if (ticketType === TicketType.EARLY_BIRD && !salesEndDate) {
      throw new BadRequestException('Ingresso early bird deve ter salesEndDate definido');
    }
  }
}
