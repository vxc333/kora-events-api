import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../events/event.entity';
import { NpsResponse } from './nps-response.entity';

export interface NpsSummary {
  eventId: string;
  totalResponses: number;
  averageScore: number;
  npsScore: number;
  promoters: number;
  passives: number;
  detractors: number;
  comments: Array<{ score: number; comment: string | null; createdAt: string }>;
}

@Injectable()
export class NpsService {
  constructor(
    @InjectRepository(NpsResponse)
    private readonly npsRepo: Repository<NpsResponse>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
  ) {}

  async getEventNps(eventId: string, organizerId: string): Promise<NpsSummary> {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento não encontrado');
    if (event.organizerId !== organizerId) throw new ForbiddenException();

    const responses = await this.npsRepo.find({
      where: { eventId },
      order: { createdAt: 'DESC' },
    });

    const total = responses.length;
    const promoters = responses.filter((r) => r.score >= 9).length;
    const passives = responses.filter((r) => r.score >= 7 && r.score <= 8).length;
    const detractors = responses.filter((r) => r.score <= 6).length;

    const npsScore =
      total === 0
        ? 0
        : Math.round(((promoters - detractors) / total) * 100);

    const averageScore =
      total === 0
        ? 0
        : responses.reduce((sum, r) => sum + r.score, 0) / total;

    const comments = responses.slice(0, 50).map((r) => ({
      score: r.score,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
    }));

    return {
      eventId,
      totalResponses: total,
      averageScore,
      npsScore,
      promoters,
      passives,
      detractors,
      comments,
    };
  }

  async exportNpsCsv(eventId: string, organizerId: string): Promise<string> {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento não encontrado');
    if (event.organizerId !== organizerId) throw new ForbiddenException();

    const responses = await this.npsRepo.find({
      where: { eventId },
      order: { createdAt: 'DESC' },
    });

    const escape = (value: string | null): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const header = 'Score,Comentário,Data';
    const rows = responses.map(
      (r) =>
        `${escape(String(r.score))},${escape(r.comment)},${escape(r.createdAt.toISOString())}`,
    );

    return [header, ...rows].join('\n');
  }

  async submitNps(
    eventId: string,
    score: number,
    comment: string | null,
    respondentToken: string,
  ): Promise<void> {
    if (!Number.isInteger(score) || score < 0 || score > 10) {
      throw new BadRequestException('Score deve ser um inteiro entre 0 e 10');
    }

    const existing = await this.npsRepo.findOne({ where: { respondentToken } });
    if (existing) {
      throw new ConflictException('Resposta já registrada para este token');
    }

    const response = this.npsRepo.create({
      eventId,
      score,
      comment: comment ?? null,
      respondentToken,
      participantId: null,
    });

    await this.npsRepo.save(response);
  }
}
