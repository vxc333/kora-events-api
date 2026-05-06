import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { ConfigService } from '@nestjs/config';
import { Participant, ParticipantStatus } from '../participants/participant.entity';
import { Event, EventStatus, CertificateTemplate } from '../events/event.entity';
import { Ticket } from '../tickets/ticket.entity';

const mockEvent: Event = {
  id: 'evt-1',
  organizerId: 'user-1',
  organizer: {} as never,
  slug: 'meu-evento-2025',
  title: 'Meu Evento 2025',
  description: 'Descrição',
  bannerUrl: null,
  logoUrl: null,
  startDate: new Date('2025-06-15'),
  endDate: new Date('2025-06-15'),
  startTime: '09:00',
  endTime: '18:00',
  location: 'Centro de Convenções SP',
  isOnline: false,
  onlineLink: null,
  maxParticipants: null,
  status: EventStatus.PUBLISHED,
  certificateTemplate: CertificateTemplate.DEFAULT,
  primaryColor: '#5B21B6',
  workloadHours: 8,
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

const mockParticipant: Participant = {
  id: 'part-1',
  eventId: 'evt-1',
  event: {} as never,
  ticketId: null,
  ticket: null,
  couponId: null,
  name: 'João da Silva',
  email: 'joao@example.com',
  cpf: '123.456.789-00',
  phone: '(11) 91234-5678',
  status: ParticipantStatus.CONFIRMED,
  qrToken: 'qr-token-uuid',
  checkedInAt: null,
  certificateReleased: false,
  reminderSent24h: false,
  reminderSent1h: false,
  registeredAt: new Date(),
  updatedAt: new Date(),
};

const mockTicket: Ticket = {
  id: 'tkt-1',
  name: 'Ingresso Padrão',
  description: null,
  price: 0,
  currency: 'BRL',
  quantity: 100,
  quantitySold: 0,
  isActive: true,
  salesStartDate: null,
  salesEndDate: null,
  isHalfPrice: false,
  discountCode: null,
  discountPercentage: null,
  eventId: 'evt-1',
  event: {} as never,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('MailService', () => {
  let service: MailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, string> = {
                SMTP_HOST: 'smtp.example.com',
                SMTP_PORT: '587',
                SMTP_USER: 'test@example.com',
                SMTP_PASS: 'pass',
                SMTP_FROM: '"Test" <test@example.com>',
                FRONTEND_URL: 'http://localhost:5173',
                APP_URL: 'http://localhost:3333',
              };
              return map[key];
            }),
          },
        },
      ],
    }).compile();
    service = module.get<MailService>(MailService);
    jest.spyOn(service['transporter'], 'sendMail').mockResolvedValue({} as never);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendPasswordReset', () => {
    it('should resolve without throwing', async () => {
      await expect(
        service.sendPasswordReset('user@example.com', 'João', 'reset-token-abc'),
      ).resolves.not.toThrow();
    });
  });

  describe('sendRegistrationConfirmation', () => {
    it('should send email with correct subject and recipient', async () => {
      await service.sendRegistrationConfirmation(mockParticipant, mockEvent, null);
      expect(service['transporter'].sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'joao@example.com',
          subject: expect.stringContaining('Meu Evento 2025'),
        }),
      );
    });

    it('should include ticket name in body when ticket is provided', async () => {
      await service.sendRegistrationConfirmation(mockParticipant, mockEvent, mockTicket);
      const call = (service['transporter'].sendMail as jest.Mock).mock.calls[0][0];
      expect(call.html).toContain('Ingresso Padrão');
    });

    it('should not include placeholder when ticket is null', async () => {
      await service.sendRegistrationConfirmation(mockParticipant, mockEvent, null);
      const call = (service['transporter'].sendMail as jest.Mock).mock.calls[0][0];
      expect(call.html).not.toContain('{{ticketRow}}');
    });
  });

  describe('sendEventReminder', () => {
    it('should send 24h reminder with correct subject', async () => {
      await service.sendEventReminder(mockParticipant, mockEvent, 24);
      expect(service['transporter'].sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'joao@example.com',
          subject: expect.stringContaining('24 horas'),
        }),
      );
    });

    it('should send 1h reminder with correct subject', async () => {
      await service.sendEventReminder(mockParticipant, mockEvent, 1);
      expect(service['transporter'].sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('1 hora'),
        }),
      );
    });
  });

  describe('sendCertificateReleased', () => {
    it('should send email with certificate download URL', async () => {
      await service.sendCertificateReleased(mockParticipant, mockEvent);
      const call = (service['transporter'].sendMail as jest.Mock).mock.calls[0][0];
      expect(call.html).toContain('qr-token-uuid');
      expect(call.subject).toContain('certificado');
    });
  });

  describe('sendCancellation', () => {
    it('should send cancellation email with event title', async () => {
      await service.sendCancellation(mockParticipant, mockEvent);
      const call = (service['transporter'].sendMail as jest.Mock).mock.calls[0][0];
      expect(call.html).toContain('Meu Evento 2025');
      expect(call.to).toBe('joao@example.com');
    });
  });
});
