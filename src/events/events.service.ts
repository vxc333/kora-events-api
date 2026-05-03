import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { Event, EventStatus } from './event.entity';
import { User, UserPlan } from '../users/user.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

const FREE_PLAN_ACTIVE_EVENT_LIMIT = 5;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function randomChars(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export interface PaginationQuery {
  page: number;
  limit: number;
  status?: EventStatus;
}

export interface EventStats {
  totalParticipants: number;
  totalCheckins: number;
  attendanceRate: number;
  certificatesIssued: number;
}

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
  ) {}

  async create(dto: CreateEventDto, organizer: User): Promise<Event> {
    if (organizer.plan === UserPlan.FREE) {
      const activeCount = await this.eventRepo.count({
        where: {
          organizerId: organizer.id,
          status: Not(In([EventStatus.CANCELLED, EventStatus.FINISHED])),
        },
      });
      if (activeCount >= FREE_PLAN_ACTIVE_EVENT_LIMIT) {
        throw new ForbiddenException(
          'Plano FREE permite no máximo 5 eventos ativos. Faça upgrade para criar mais eventos.',
        );
      }
    }

    const slug = `${slugify(dto.title)}-${randomChars(4)}`;

    const event = this.eventRepo.create({
      ...dto,
      slug,
      organizerId: organizer.id,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
    });

    return this.eventRepo.save(event);
  }

  async findMyEvents(
    organizerId: string,
    { page, limit, status }: PaginationQuery,
  ): Promise<{ data: Event[]; total: number; page: number; limit: number }> {
    const where: Record<string, unknown> = { organizerId };
    if (status) where['status'] = status;

    const [data, total] = await this.eventRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async findOne(id: string, organizerId: string): Promise<Event> {
    const event = await this.eventRepo.findOne({ where: { id } });
    if (!event || event.organizerId !== organizerId) {
      throw new NotFoundException('Evento não encontrado');
    }
    return event;
  }

  async findBySlug(slug: string): Promise<Event> {
    const event = await this.eventRepo.findOne({
      where: { slug },
      relations: ['organizer'],
    });
    if (!event) throw new NotFoundException('Evento não encontrado');
    return event;
  }

  async update(id: string, organizerId: string, dto: UpdateEventDto): Promise<Event> {
    const event = await this.findOne(id, organizerId);
    const updated = Object.assign(event, {
      ...dto,
      ...(dto.startDate ? { startDate: new Date(dto.startDate) } : {}),
      ...(dto.endDate ? { endDate: new Date(dto.endDate) } : {}),
    });
    return this.eventRepo.save(updated);
  }

  async cancel(id: string, organizerId: string): Promise<Event> {
    const event = await this.findOne(id, organizerId);
    event.status = EventStatus.CANCELLED;
    return this.eventRepo.save(event);
  }

  async publish(id: string, organizerId: string): Promise<Event> {
    const event = await this.findOne(id, organizerId);
    event.status = EventStatus.PUBLISHED;
    return this.eventRepo.save(event);
  }

  async finish(id: string, organizerId: string): Promise<Event> {
    const event = await this.findOne(id, organizerId);
    event.status = EventStatus.FINISHED;
    return this.eventRepo.save(event);
  }

  async updateBanner(id: string, organizerId: string, bannerUrl: string): Promise<Event> {
    const event = await this.findOne(id, organizerId);
    event.bannerUrl = bannerUrl;
    return this.eventRepo.save(event);
  }

  async updateLogo(id: string, organizerId: string, logoUrl: string): Promise<Event> {
    const event = await this.findOne(id, organizerId);
    event.logoUrl = logoUrl;
    return this.eventRepo.save(event);
  }

  async getStats(id: string, organizerId: string): Promise<EventStats> {
    await this.findOne(id, organizerId);
    return {
      totalParticipants: 0,
      totalCheckins: 0,
      attendanceRate: 0,
      certificatesIssued: 0,
    };
  }
}
