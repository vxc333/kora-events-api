import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Event } from '../events/event.entity';
import { Participant, ParticipantStatus } from '../participants/participant.entity';
import { Ticket } from '../tickets/ticket.entity';
import { EventSession } from '../event-sessions/event-session.entity';
import { SessionCheckin } from '../event-sessions/session-checkin.entity';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfmake = require('pdfmake');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Helvetica = require('pdfmake/standard-fonts/Helvetica');

pdfmake.addFonts(Helvetica);
pdfmake.setUrlAccessPolicy(() => false);

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(Participant)
    private readonly participantRepo: Repository<Participant>,
    @InjectRepository(EventSession)
    private readonly sessionRepo: Repository<EventSession>,
    @InjectRepository(SessionCheckin)
    private readonly sessionCheckinRepo: Repository<SessionCheckin>,
  ) {}

  async getFinancialSummary(organizerId: string) {
    const events = await this.eventRepo.find({
      where: { organizerId },
      relations: ['tickets'],
      order: { startDate: 'DESC' },
    });

    const extrato = events.map((event) => {
      const tickets = (event.tickets ?? []) as unknown as Ticket[];

      const receitaBruta = tickets.reduce((s, t) => s + t.price * t.quantitySold, 0);
      const ingressosPagos = tickets
        .filter((t) => t.price > 0)
        .reduce((s, t) => s + t.quantitySold, 0);
      const taxaPlataforma = receitaBruta > 0
        ? receitaBruta * 0.05 + ingressosPagos * 0.99
        : 0;

      return {
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.startDate,
        eventStatus: event.status,
        ingressosVendidos: tickets.reduce((s, t) => s + t.quantitySold, 0),
        ingressosPagos,
        receitaBruta,
        taxaPlataforma,
        valorRepassar: receitaBruta - taxaPlataforma,
      };
    });

    return {
      receitaBruta: extrato.reduce((s, e) => s + e.receitaBruta, 0),
      taxaPlataforma: extrato.reduce((s, e) => s + e.taxaPlataforma, 0),
      valorRepassar: extrato.reduce((s, e) => s + e.valorRepassar, 0),
      totalIngressosPagos: extrato.reduce((s, e) => s + e.ingressosPagos, 0),
      totalEventos: events.length,
      extrato,
    };
  }

  async generateAttendancePdf(eventId: string, organizerId: string): Promise<Buffer> {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento não encontrado');
    if (event.organizerId !== organizerId) throw new ForbiddenException();

    const participants = await this.participantRepo.find({
      where: { eventId },
      order: { registeredAt: 'ASC' },
      relations: ['ticket'],
    });

    const total = participants.length;
    const confirmed = participants.filter((p) => p.status === ParticipantStatus.CONFIRMED).length;
    const cancelled = participants.filter((p) => p.status === ParticipantStatus.CANCELLED).length;
    const pending = participants.filter((p) => p.status === ParticipantStatus.PENDING).length;

    const docDefinition = {
      content: [
        { text: `Relatório de Presença — ${event.title}`, style: 'header' },
        {
          text: `Data: ${event.startDate.toLocaleDateString('pt-BR')}`,
          margin: [0, 4, 0, 0],
        },
        {
          text: `Local: ${event.location ?? 'Online'}`,
          margin: [0, 2, 0, 0],
        },
        {
          text: `Total: ${total}  |  Confirmados: ${confirmed}  |  Pendentes: ${pending}  |  Cancelados: ${cancelled}`,
          margin: [0, 8, 0, 16],
        },
        {
          table: {
            headerRows: 1,
            widths: ['*', '*', 'auto', 'auto'],
            body: [
              ['Nome', 'E-mail', 'Ingresso', 'Status'],
              ...participants.map((p) => [
                p.name,
                p.email,
                p.ticket?.name ?? '—',
                p.status,
              ]),
            ],
          },
        },
      ],
      styles: {
        header: { fontSize: 16, bold: true, marginBottom: 8 },
      },
      defaultStyle: { font: 'Helvetica', fontSize: 10 },
    };

    const doc = pdfmake.createPdf(docDefinition);
    return doc.getBuffer();
  }

  async getExceptions(eventId: string, organizerId: string): Promise<Participant[]> {
    const event = await this.eventRepo.findOne({ where: { id: eventId, organizerId } });
    if (!event) throw new NotFoundException('Evento não encontrado');
    return this.participantRepo.find({
      where: { eventId, status: ParticipantStatus.CONFIRMED, checkedInAt: IsNull() },
      order: { name: 'ASC' },
      relations: ['ticket'],
    });
  }

  async getMinimumAttendance(eventId: string, organizerId: string) {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento não encontrado');
    if (event.organizerId !== organizerId) throw new ForbiddenException();

    const minimumPercentage = Number(event.minimumAttendancePercentage) || 75;

    const [sessions, participants] = await Promise.all([
      this.sessionRepo.find({ where: { eventId } }),
      this.participantRepo.find({ where: { eventId }, order: { name: 'ASC' } }),
    ]);

    const totalSessions = sessions.length;

    if (totalSessions === 0) {
      // No sessions defined — all confirmed participants are eligible
      const records = participants
        .filter(p => p.status === ParticipantStatus.CONFIRMED)
        .map(p => ({
          participantId: p.id,
          participantName: p.name,
          participantEmail: p.email,
          totalSessions: 0,
          attendedSessions: 0,
          percentage: 100,
          certificateEligible: true,
        }));
      return { minimumPercentage, eligible: records.length, total: records.length, records };
    }

    const sessionIds = sessions.map(s => s.id);
    const checkins = await this.sessionCheckinRepo
      .createQueryBuilder('sc')
      .where('sc.eventId = :eventId', { eventId })
      .andWhere('sc.sessionId IN (:...sessionIds)', { sessionIds })
      .getMany();

    // Group checkins by participantId
    const attendanceMap = new Map<string, number>();
    for (const c of checkins) {
      attendanceMap.set(c.participantId, (attendanceMap.get(c.participantId) ?? 0) + 1);
    }

    const records = participants
      .filter(p => p.status === ParticipantStatus.CONFIRMED)
      .map(p => {
        const attended = attendanceMap.get(p.id) ?? 0;
        const percentage = Math.round((attended / totalSessions) * 100);
        return {
          participantId: p.id,
          participantName: p.name,
          participantEmail: p.email,
          totalSessions,
          attendedSessions: attended,
          percentage,
          certificateEligible: percentage >= minimumPercentage,
        };
      });

    const eligible = records.filter(r => r.certificateEligible).length;
    return { minimumPercentage, eligible, total: records.length, records };
  }
}
