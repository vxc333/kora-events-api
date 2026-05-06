import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from './ticket.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
  ) {}

  async create(eventId: string, dto: CreateTicketDto): Promise<Ticket> {
    if (dto.price > 0) {
      throw new HttpException(
        'Pagamentos serão implementados em breve. Por enquanto, apenas ingressos gratuitos estão disponíveis.',
        HttpStatus.NOT_IMPLEMENTED,
      );
    }

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
    const ticket = await this.findTicketForEvent(eventId, ticketId);
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
}
