import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Event, EventStatus, CertificateTemplate } from '../events/event.entity';
import { Participant, ParticipantStatus } from '../participants/participant.entity';

jest.mock('pdfmake', () => ({
  addFonts: jest.fn(),
  setUrlAccessPolicy: jest.fn(),
  createPdf: jest.fn().mockReturnValue({
    getBuffer: jest.fn().mockResolvedValue(Buffer.from('%PDF-test')),
  }),
}));

const mockEvent: Event = {
  id: 'evt-uuid-1',
  slug: 'evento-teste',
  title: 'Evento Teste',
  description: 'Descrição',
  bannerUrl: null,
  logoUrl: null,
  startDate: new Date('2026-06-01T09:00:00Z'),
  endDate: new Date('2026-06-01T18:00:00Z'),
  startTime: '09:00',
  endTime: '18:00',
  location: 'São Paulo',
  onlineLink: null,
  isOnline: false,
  minimumAttendancePercentage: 75,
  workloadHours: 8,
  status: EventStatus.PUBLISHED,
  isPublic: true,
  requiresApproval: false,
  maxParticipants: null,
  hasPaidTickets: false,
  primaryColor: '#6366f1',
  certificateTemplate: CertificateTemplate.DEFAULT,
  organizerId: 'org-uuid-1',
  organizer: {} as never,
  tickets: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockParticipant: Participant = {
  id: 'part-uuid-1',
  eventId: 'evt-uuid-1',
  event: {} as never,
  ticketId: null,
  ticket: null,
  couponId: null,
  name: 'João da Silva',
  email: 'joao@example.com',
  cpf: null,
  status: ParticipantStatus.CONFIRMED,
  qrToken: 'abc12345-0000-0000-0000-000000000000',
  checkedInAt: null,
  certificateReleased: false,
  registeredAt: new Date(),
  updatedAt: new Date(),
};

describe('ReportsService', () => {
  let service: ReportsService;
  let eventRepo: jest.Mocked<Repository<Event>>;
  let participantRepo: jest.Mocked<Repository<Participant>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: getRepositoryToken(Event),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(Participant),
          useValue: { find: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    eventRepo = module.get(getRepositoryToken(Event));
    participantRepo = module.get(getRepositoryToken(Participant));
  });

  it('should throw NotFoundException when event does not exist', async () => {
    eventRepo.findOne.mockResolvedValue(null);
    await expect(service.generateAttendancePdf('evt-uuid-1', 'org-uuid-1')).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException when organizer does not own the event', async () => {
    eventRepo.findOne.mockResolvedValue({ ...mockEvent, organizerId: 'other-org' });
    await expect(service.generateAttendancePdf('evt-uuid-1', 'org-uuid-1')).rejects.toThrow(ForbiddenException);
  });

  it('should return a Buffer for valid request', async () => {
    eventRepo.findOne.mockResolvedValue({ ...mockEvent });
    participantRepo.find.mockResolvedValue([{ ...mockParticipant }]);

    const result = await service.generateAttendancePdf('evt-uuid-1', 'org-uuid-1');

    expect(result).toBeInstanceOf(Buffer);
  });

  it('should build table rows for each participant', async () => {
    const pdfmake = require('pdfmake');
    eventRepo.findOne.mockResolvedValue({ ...mockEvent });
    participantRepo.find.mockResolvedValue([{ ...mockParticipant }, { ...mockParticipant, id: 'part-uuid-2', name: 'Maria' }]);

    await service.generateAttendancePdf('evt-uuid-1', 'org-uuid-1');

    const docDefinition = (pdfmake.createPdf as jest.Mock).mock.calls.at(-1)[0];
    const tableBody = docDefinition.content.find((c: { table?: unknown }) => c.table).table.body;
    expect(tableBody).toHaveLength(3); // header + 2 participants
  });
});
