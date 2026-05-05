import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CertificatesService } from './certificates.service';
import { Participant, ParticipantStatus } from '../participants/participant.entity';
import { Event, CertificateTemplate, EventStatus } from '../events/event.entity';
import { CertificateSigner } from '../certificate-signers/certificate-signer.entity';

jest.mock('pdfmake', () => ({
  addFonts: jest.fn(),
  setUrlAccessPolicy: jest.fn(),
  createPdf: jest.fn().mockReturnValue({
    getBuffer: jest.fn().mockResolvedValue(Buffer.from('%PDF-test')),
  }),
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn().mockReturnValue(Buffer.from('fake-image')),
}));

const pastDate = new Date('2025-01-01T18:00:00Z');
const futureDate = new Date('2099-12-31T18:00:00Z');

const mockEvent: Event = {
  id: 'evt-uuid-1',
  slug: 'evento-teste',
  title: 'Evento Teste',
  description: 'Descrição',
  bannerUrl: null,
  logoUrl: null,
  startDate: new Date('2025-01-01T09:00:00Z'),
  endDate: pastDate,
  startTime: '09:00',
  endTime: '18:00',
  location: 'São Paulo',
  onlineLink: null,
  isOnline: false,
  minimumAttendancePercentage: 75,
  workloadHours: 8,
  status: EventStatus.FINISHED,
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
  phone: null,
  status: ParticipantStatus.CONFIRMED,
  qrToken: 'abc12345-0000-0000-0000-000000000000',
  checkedInAt: new Date('2025-01-01T10:00:00Z'),
  certificateReleased: false,
  registeredAt: new Date(),
  updatedAt: new Date(),
};

describe('CertificatesService', () => {
  let service: CertificatesService;
  let participantRepo: jest.Mocked<Repository<Participant>>;
  let eventRepo: jest.Mocked<Repository<Event>>;
  let signerRepo: jest.Mocked<Repository<CertificateSigner>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificatesService,
        {
          provide: getRepositoryToken(Participant),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(Event),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(CertificateSigner),
          useValue: { find: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<CertificatesService>(CertificatesService);
    participantRepo = module.get(getRepositoryToken(Participant));
    eventRepo = module.get(getRepositoryToken(Event));
    signerRepo = module.get(getRepositoryToken(CertificateSigner));
  });

  describe('generate', () => {
    it('should throw NotFoundException when qrToken not found', async () => {
      participantRepo.findOne.mockResolvedValue(null);
      await expect(service.generate('invalid-token')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException with reason "event_not_ended" when event has not ended', async () => {
      participantRepo.findOne.mockResolvedValue({ ...mockParticipant, checkedInAt: null, certificateReleased: false });
      eventRepo.findOne.mockResolvedValue({ ...mockEvent, endDate: futureDate });
      signerRepo.find.mockResolvedValue([]);

      let caught: unknown;
      try { await service.generate(mockParticipant.qrToken); } catch (e) { caught = e; }
      expect(caught).toBeInstanceOf(ForbiddenException);
      expect((caught as ForbiddenException).getResponse()).toMatchObject({ reason: 'event_not_ended' });
    });

    it('should throw ForbiddenException with reason "no_checkin" when event ended but not checked in', async () => {
      participantRepo.findOne.mockResolvedValue({ ...mockParticipant, checkedInAt: null, certificateReleased: false });
      eventRepo.findOne.mockResolvedValue({ ...mockEvent, endDate: pastDate });
      signerRepo.find.mockResolvedValue([]);

      let caught: unknown;
      try { await service.generate(mockParticipant.qrToken); } catch (e) { caught = e; }
      expect(caught).toBeInstanceOf(ForbiddenException);
      expect((caught as ForbiddenException).getResponse()).toMatchObject({ reason: 'no_checkin' });
    });

    it('should return pdf buffer and event slug when event ended and participant checked in', async () => {
      participantRepo.findOne.mockResolvedValue({ ...mockParticipant, checkedInAt: new Date() });
      eventRepo.findOne.mockResolvedValue({ ...mockEvent, endDate: pastDate });
      signerRepo.find.mockResolvedValue([]);

      const result = await service.generate(mockParticipant.qrToken);

      expect(result.pdf).toBeInstanceOf(Buffer);
      expect(result.slug).toBe('evento-teste');
    });

    it('should bypass eligibility checks when certificateReleased is true', async () => {
      participantRepo.findOne.mockResolvedValue({ ...mockParticipant, checkedInAt: null, certificateReleased: true });
      eventRepo.findOne.mockResolvedValue({ ...mockEvent, endDate: futureDate });
      signerRepo.find.mockResolvedValue([]);

      const result = await service.generate(mockParticipant.qrToken);

      expect(result.pdf).toBeInstanceOf(Buffer);
    });
  });
});
