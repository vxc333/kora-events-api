import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailSchedulerService } from './mail-scheduler.service';
import { MailService } from './mail.service';
import { Participant, ParticipantStatus } from '../participants/participant.entity';
import { Event, EventStatus, CertificateTemplate } from '../events/event.entity';

const makeEvent = (hoursFromNow: number): Event => {
  const start = new Date(Date.now() + hoursFromNow * 3_600_000);
  return {
    id: 'evt-1',
    title: 'Evento Teste',
    slug: 'evento-teste',
    startDate: start,
    startTime: `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`,
    endDate: start,
    endTime: '18:00',
    location: 'SP',
    status: EventStatus.PUBLISHED,
    organizerId: 'user-1',
    organizer: {} as never,
    description: '',
    bannerUrl: null,
    logoUrl: null,
    isOnline: false,
    onlineLink: null,
    maxParticipants: null,
    certificateTemplate: CertificateTemplate.DEFAULT,
    primaryColor: '#5B21B6',
    workloadHours: null,
    minimumAttendancePercentage: null as unknown as number,
    certificateBodyText: null,
    pageBlocks: null,
    pageSettings: null,
    isPublic: true,
    requiresApproval: false,
    hasPaidTickets: false,
    tickets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

const mockParticipant: Participant = {
  id: 'part-1',
  eventId: 'evt-1',
  event: {} as never,
  ticketId: null,
  ticket: null,
  couponId: null,
  name: 'João',
  email: 'joao@example.com',
  cpf: null,
  phone: null,
  status: ParticipantStatus.CONFIRMED,
  qrToken: 'qr-token',
  checkedInAt: null,
  certificateReleased: false,
  reminderSent24h: false,
  reminderSent1h: false,
  registeredAt: new Date(),
  updatedAt: new Date(),
};

describe('MailSchedulerService', () => {
  let service: MailSchedulerService;
  let participantRepo: jest.Mocked<Repository<Participant>>;
  let eventRepo: jest.Mocked<Repository<Event>>;
  let mailService: jest.Mocked<MailService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailSchedulerService,
        {
          provide: getRepositoryToken(Participant),
          useValue: { find: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(Event),
          useValue: { find: jest.fn() },
        },
        {
          provide: MailService,
          useValue: {
            sendEventReminder: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<MailSchedulerService>(MailSchedulerService);
    participantRepo = module.get(getRepositoryToken(Participant));
    eventRepo = module.get(getRepositoryToken(Event));
    mailService = module.get(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendReminders', () => {
    it('should send 24h reminder and mark reminderSent24h=true', async () => {
      const event = makeEvent(24);
      eventRepo.find.mockResolvedValue([event]);
      participantRepo.find.mockResolvedValue([{ ...mockParticipant, reminderSent24h: false }]);
      participantRepo.save.mockResolvedValue({ ...mockParticipant, reminderSent24h: true });

      await service.sendReminders();

      expect(mailService.sendEventReminder).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'part-1' }),
        event,
        24,
      );
      expect(participantRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ reminderSent24h: true }),
      );
    });

    it('should send 1h reminder and mark reminderSent1h=true', async () => {
      const event = makeEvent(1);
      eventRepo.find.mockResolvedValue([event]);
      participantRepo.find.mockResolvedValue([{ ...mockParticipant, reminderSent1h: false }]);
      participantRepo.save.mockResolvedValue({ ...mockParticipant, reminderSent1h: true });

      await service.sendReminders();

      expect(mailService.sendEventReminder).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'part-1' }),
        event,
        1,
      );
      expect(participantRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ reminderSent1h: true }),
      );
    });

    it('should not query participants when no events are in reminder window', async () => {
      const event = makeEvent(12);
      eventRepo.find.mockResolvedValue([event]);

      await service.sendReminders();

      expect(participantRepo.find).not.toHaveBeenCalled();
      expect(mailService.sendEventReminder).not.toHaveBeenCalled();
    });

    it('should not fail if sending reminder throws', async () => {
      const event = makeEvent(24);
      eventRepo.find.mockResolvedValue([event]);
      participantRepo.find.mockResolvedValue([{ ...mockParticipant }]);
      mailService.sendEventReminder.mockRejectedValue(new Error('SMTP error'));

      await expect(service.sendReminders()).resolves.not.toThrow();
    });
  });
});
