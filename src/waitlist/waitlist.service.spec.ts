import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { WaitlistService } from './waitlist.service';
import { WaitlistEntry, WaitlistStatus } from './waitlist-entry.entity';
import { Ticket, TicketType } from '../tickets/ticket.entity';
import { Event } from '../events/event.entity';
import { MailService } from '../mail/mail.service';

const mockEvent = {
  id: 'evt-uuid-1', slug: 'evento-teste', title: 'Evento Teste',
  organizerId: 'usr-uuid-1',
} as Event;

const mockTicket = {
  id: 'tkt-uuid-1', eventId: 'evt-uuid-1', name: 'Ingresso Padrão',
  price: 0, quantity: 10, quantitySold: 10, isActive: true,
  waitlistEnabled: true, waitlistHoldsSpot: false,
  ticketType: TicketType.STANDARD,
} as Ticket;

const mockEntry: WaitlistEntry = {
  id: 'wl-uuid-1', eventId: 'evt-uuid-1', ticketId: 'tkt-uuid-1',
  event: mockEvent, ticket: mockTicket,
  name: 'Maria Silva', email: 'maria@example.com', cpf: null, phone: null,
  status: WaitlistStatus.WAITING, claimToken: null, claimExpiresAt: null,
  createdAt: new Date(),
};

describe('WaitlistService', () => {
  let service: WaitlistService;
  let waitlistRepo: jest.Mocked<Repository<WaitlistEntry>>;
  let ticketRepo: jest.Mocked<Repository<Ticket>>;
  let eventRepo: jest.Mocked<Repository<Event>>;
  let mailService: jest.Mocked<MailService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WaitlistService,
        {
          provide: getRepositoryToken(WaitlistEntry),
          useValue: { findOne: jest.fn(), find: jest.fn(), create: jest.fn(), save: jest.fn(), remove: jest.fn() },
        },
        {
          provide: getRepositoryToken(Ticket),
          useValue: { findOne: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(Event),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: MailService,
          useValue: { sendWaitlistNotification: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(WaitlistService);
    waitlistRepo = module.get(getRepositoryToken(WaitlistEntry));
    ticketRepo = module.get(getRepositoryToken(Ticket));
    eventRepo = module.get(getRepositoryToken(Event));
    mailService = module.get(MailService);
  });

  describe('join', () => {
    it('should throw NotFoundException when ticket not found', async () => {
      ticketRepo.findOne.mockResolvedValue(null);
      await expect(service.join('evt-uuid-1', 'tkt-uuid-1', { name: 'Maria', email: 'maria@example.com' }))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw UnprocessableEntityException when waitlist not enabled', async () => {
      ticketRepo.findOne.mockResolvedValue({ ...mockTicket, waitlistEnabled: false });
      await expect(service.join('evt-uuid-1', 'tkt-uuid-1', { name: 'Maria', email: 'maria@example.com' }))
        .rejects.toThrow(UnprocessableEntityException);
    });

    it('should throw ConflictException when email already in queue', async () => {
      ticketRepo.findOne.mockResolvedValue(mockTicket);
      waitlistRepo.findOne.mockResolvedValue(mockEntry);
      await expect(service.join('evt-uuid-1', 'tkt-uuid-1', { name: 'Maria', email: 'maria@example.com' }))
        .rejects.toThrow(ConflictException);
    });

    it('should create waitlist entry successfully', async () => {
      ticketRepo.findOne.mockResolvedValue(mockTicket);
      waitlistRepo.findOne.mockResolvedValue(null);
      waitlistRepo.create.mockReturnValue(mockEntry);
      waitlistRepo.save.mockResolvedValue(mockEntry);
      const result = await service.join('evt-uuid-1', 'tkt-uuid-1', { name: 'Maria', email: 'maria@example.com' });
      expect(waitlistRepo.save).toHaveBeenCalled();
      expect(result.email).toBe('maria@example.com');
    });
  });

  describe('notifyNext', () => {
    it('should do nothing when no WAITING entries exist', async () => {
      waitlistRepo.findOne.mockResolvedValue(null);
      await service.notifyNext('tkt-uuid-1');
      expect(mailService.sendWaitlistNotification).not.toHaveBeenCalled();
    });

    it('should set claimToken, claimExpiresAt, status NOTIFIED and send email', async () => {
      const waiting = { ...mockEntry, status: WaitlistStatus.WAITING };
      waitlistRepo.findOne.mockResolvedValue(waiting);
      waitlistRepo.save.mockResolvedValue({ ...waiting, status: WaitlistStatus.NOTIFIED });
      mailService.sendWaitlistNotification.mockResolvedValue(undefined);

      await service.notifyNext('tkt-uuid-1');

      expect(waitlistRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: WaitlistStatus.NOTIFIED, claimToken: expect.any(String) }),
      );
      expect(mailService.sendWaitlistNotification).toHaveBeenCalled();
    });
  });

  describe('resolveClaimToken', () => {
    it('should throw NotFoundException for invalid token', async () => {
      waitlistRepo.findOne.mockResolvedValue(null);
      await expect(service.resolveClaimToken('invalid-token')).rejects.toThrow(NotFoundException);
    });

    it('should throw UnprocessableEntityException for expired token', async () => {
      const expired = {
        ...mockEntry,
        status: WaitlistStatus.NOTIFIED,
        claimToken: 'valid-token',
        claimExpiresAt: new Date(Date.now() - 1000),
        event: mockEvent,
      };
      waitlistRepo.findOne.mockResolvedValue(expired);
      await expect(service.resolveClaimToken('valid-token')).rejects.toThrow(UnprocessableEntityException);
    });

    it('should return pre-fill data for valid token', async () => {
      const valid = {
        ...mockEntry,
        status: WaitlistStatus.NOTIFIED,
        claimToken: 'valid-token',
        claimExpiresAt: new Date(Date.now() + 3_600_000),
        event: mockEvent,
      };
      waitlistRepo.findOne.mockResolvedValue(valid);
      const result = await service.resolveClaimToken('valid-token');
      expect(result.email).toBe('maria@example.com');
      expect(result.eventSlug).toBe('evento-teste');
    });
  });

  describe('processExpired', () => {
    it('should mark NOTIFIED entries as EXPIRED and call notifyNext', async () => {
      const notified = {
        ...mockEntry,
        status: WaitlistStatus.NOTIFIED,
        claimToken: 'token',
        claimExpiresAt: new Date(Date.now() - 1000),
        ticket: { ...mockTicket, waitlistHoldsSpot: false },
      };
      waitlistRepo.find.mockResolvedValue([notified]);
      waitlistRepo.save.mockResolvedValue({ ...notified, status: WaitlistStatus.EXPIRED });
      waitlistRepo.findOne.mockResolvedValue(null);

      await service.processExpired();

      expect(waitlistRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: WaitlistStatus.EXPIRED }),
      );
    });

    it('should decrement quantitySold when hold mode and no next person', async () => {
      const notified = {
        ...mockEntry,
        status: WaitlistStatus.NOTIFIED,
        claimToken: 'token',
        claimExpiresAt: new Date(Date.now() - 1000),
        ticket: { ...mockTicket, waitlistHoldsSpot: true, quantitySold: 5 },
      };
      waitlistRepo.find.mockResolvedValue([notified]);
      waitlistRepo.save.mockResolvedValue({ ...notified, status: WaitlistStatus.EXPIRED });
      waitlistRepo.findOne.mockResolvedValue(null);
      ticketRepo.findOne.mockResolvedValue({ ...mockTicket, quantitySold: 5 });
      ticketRepo.save.mockResolvedValue({ ...mockTicket, quantitySold: 4 });

      await service.processExpired();

      expect(ticketRepo.save).toHaveBeenCalledWith(expect.objectContaining({ quantitySold: 4 }));
    });
  });
});
