import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventPartner } from './event-partner.entity';
import { EventsService } from '../events/events.service';
import { CreateEventPartnerDto } from './dto/create-event-partner.dto';
import { UpdateEventPartnerDto } from './dto/update-event-partner.dto';

@Injectable()
export class EventPartnersService {
  constructor(
    @InjectRepository(EventPartner)
    private readonly partnerRepo: Repository<EventPartner>,
    private readonly eventsService: EventsService,
  ) {}

  async create(eventId: string, organizerId: string, dto: CreateEventPartnerDto): Promise<EventPartner> {
    await this.eventsService.findOne(eventId, organizerId);
    const partner = this.partnerRepo.create({ ...dto, eventId });
    return this.partnerRepo.save(partner);
  }

  async findByEvent(eventId: string, organizerId: string): Promise<EventPartner[]> {
    await this.eventsService.findOne(eventId, organizerId);
    return this.partnerRepo.find({
      where: { eventId },
      order: { displayOrder: 'ASC' },
    });
  }

  private async findPartner(eventId: string, partnerId: string): Promise<EventPartner> {
    const partner = await this.partnerRepo.findOne({ where: { id: partnerId, eventId } });
    if (!partner) throw new NotFoundException('Parceiro não encontrado');
    return partner;
  }

  async update(
    eventId: string,
    partnerId: string,
    organizerId: string,
    dto: UpdateEventPartnerDto,
  ): Promise<EventPartner> {
    await this.eventsService.findOne(eventId, organizerId);
    const partner = await this.findPartner(eventId, partnerId);
    Object.assign(partner, dto);
    return this.partnerRepo.save(partner);
  }

  async updateLogo(
    eventId: string,
    partnerId: string,
    organizerId: string,
    logoUrl: string,
  ): Promise<EventPartner> {
    await this.eventsService.findOne(eventId, organizerId);
    const partner = await this.findPartner(eventId, partnerId);
    partner.logoUrl = logoUrl;
    return this.partnerRepo.save(partner);
  }

  async remove(eventId: string, partnerId: string, organizerId: string): Promise<void> {
    await this.eventsService.findOne(eventId, organizerId);
    const partner = await this.findPartner(eventId, partnerId);
    await this.partnerRepo.remove(partner);
  }
}
