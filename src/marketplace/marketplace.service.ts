import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event, EventStatus } from '../events/event.entity';
import { Ticket } from '../tickets/ticket.entity';

export interface MarketplaceEvent {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  bannerUrl: string | null;
  startDate: string;
  endDate: string;
  location: string | null;
  isOnline: boolean;
  primaryColor: string;
  ticketsAvailable: number;
  minPrice: number;
  category: string | null;
  featured: boolean;
}

export interface MarketplaceResponse {
  data: MarketplaceEvent[];
  total: number;
  page: number;
}

export interface MarketplaceQueryParams {
  search?: string;
  category?: string;
  city?: string;
  free?: boolean;
  page?: number;
  limit?: number;
}

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
  ) {}

  async listEvents(params: MarketplaceQueryParams): Promise<MarketplaceResponse> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 12;

    const qb = this.eventRepo
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.tickets', 'ticket')
      .where('event.status = :status', { status: EventStatus.PUBLISHED })
      .andWhere('event.isPublic = true');

    if (params.search) {
      qb.andWhere('event.title ILIKE :search', { search: `%${params.search}%` });
    }

    if (params.city) {
      qb.andWhere('event.location ILIKE :city', { city: `%${params.city}%` });
    }

    const events = await qb.getMany();

    // Map to response shape and compute ticket metrics
    let mapped: MarketplaceEvent[] = events.map((event) => {
      const tickets = ((event.tickets ?? []) as unknown as Ticket[]).filter((t) => t.isActive);

      const minPrice = tickets.length > 0 ? Math.min(...tickets.map((t) => Number(t.price))) : 0;

      const ticketsAvailable = tickets.reduce((sum, t) => {
        const available = t.quantity != null ? t.quantity - t.quantitySold : 999;
        return sum + available;
      }, 0);

      return {
        id: event.id,
        slug: event.slug,
        title: event.title,
        description: event.description ?? null,
        bannerUrl: event.bannerUrl,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        location: event.location,
        isOnline: event.isOnline,
        primaryColor: event.primaryColor,
        ticketsAvailable,
        minPrice,
        category: null,
        featured: false,
      };
    });

    // Apply free filter in memory (after ticket metrics are computed)
    if (params.free === true) {
      mapped = mapped.filter((e) => e.minPrice === 0);
    }

    const total = mapped.length;
    const offset = (page - 1) * limit;
    const data = mapped.slice(offset, offset + limit);

    return { data, total, page };
  }
}
