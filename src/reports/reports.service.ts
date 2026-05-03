import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../events/event.entity';
import { Participant, ParticipantStatus } from '../participants/participant.entity';

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
  ) {}

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
}
