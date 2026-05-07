import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { BroadcastsService } from './broadcasts.service';
import { BroadcastMessage, BroadcastSegment, BroadcastStatus } from './broadcast-message.entity';
import { Event } from '../events/event.entity';
import { Participant, ParticipantStatus } from '../participants/participant.entity';
import { MailService } from '../mail/mail.service';

const mockEvent = { id: 'evt-uuid-1', organizerId: 'usr-uuid-1', slug: 'evento' } as Event;

const mockParticipant = {
  id: 'part-uuid-1', eventId: 'evt-uuid-1',
  name: 'João Silva', email: 'joao@example.com',
  status: ParticipantStatus.CONFIRMED, checkedInAt: null,
} as Participant;

const mockBroadcast: BroadcastMessage = {
  id: 'brd-uuid-1', eventId: 'evt-uuid-1', event: mockEvent,
  subject: 'Teste', htmlBody: '<p>Olá</p>',
  segment: BroadcastSegment.ALL, status: BroadcastStatus.PENDING,
  recipientCount: 1, sentCount: 0, failedCount: 0,
  createdAt: new Date(),
};

describe('BroadcastsService', () => {
  let service: BroadcastsService;
  let broadcastRepo: jest.Mocked<Repository<BroadcastMessage>>;
  let eventRepo: jest.Mocked<Repository<Event>>;
  let participantRepo: jest.Mocked<Repository<Participant>>;
  let mailService: jest.Mocked<MailService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BroadcastsService,
        {
          provide: getRepositoryToken(BroadcastMessage),
          useValue: { findOne: jest.fn(), find: jest.fn(), create: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(Event),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(Participant),
          useValue: { find: jest.fn() },
        },
        {
          provide: MailService,
          useValue: { sendBroadcast: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(BroadcastsService);
    broadcastRepo = module.get(getRepositoryToken(BroadcastMessage));
    eventRepo = module.get(getRepositoryToken(Event));
    participantRepo = module.get(getRepositoryToken(Participant));
    mailService = module.get(MailService);
  });

  describe('send', () => {
    it('should throw NotFoundException when event not found', async () => {
      eventRepo.findOne.mockResolvedValue(null);
      await expect(
        service.send('evt-uuid-1', 'usr-uuid-1', { subject: 'X', htmlBody: '<p/>', segment: BroadcastSegment.ALL }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create broadcast with recipientCount and return 202 body', async () => {
      eventRepo.findOne.mockResolvedValue(mockEvent);
      participantRepo.find.mockResolvedValue([mockParticipant]);
      broadcastRepo.create.mockReturnValue(mockBroadcast);
      broadcastRepo.save.mockResolvedValue(mockBroadcast);

      const result = await service.send('evt-uuid-1', 'usr-uuid-1', {
        subject: 'Teste', htmlBody: '<p>Olá</p>', segment: BroadcastSegment.ALL,
      });

      expect(result.recipientCount).toBe(1);
      expect(result.status).toBe(BroadcastStatus.PENDING);
    });
  });

  describe('sendInBackground', () => {
    it('should update status to DONE and increment sentCount on success', async () => {
      const broadcast = { ...mockBroadcast, status: BroadcastStatus.PENDING };
      broadcastRepo.findOne.mockResolvedValue(broadcast);
      broadcastRepo.save.mockResolvedValue(broadcast);
      mailService.sendBroadcast.mockResolvedValue(undefined);

      await service['sendInBackground']('brd-uuid-1', [mockParticipant]);

      expect(mailService.sendBroadcast).toHaveBeenCalledWith(
        'joao@example.com', 'João Silva', 'Teste', '<p>Olá</p>',
      );
      expect(broadcastRepo.save).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: BroadcastStatus.DONE, sentCount: 1, failedCount: 0 }),
      );
    });

    it('should increment failedCount when email send throws', async () => {
      const broadcast = { ...mockBroadcast, status: BroadcastStatus.PENDING };
      broadcastRepo.findOne.mockResolvedValue(broadcast);
      broadcastRepo.save.mockResolvedValue(broadcast);
      mailService.sendBroadcast.mockRejectedValue(new Error('SMTP error'));

      await service['sendInBackground']('brd-uuid-1', [mockParticipant]);

      expect(broadcastRepo.save).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: BroadcastStatus.DONE, sentCount: 0, failedCount: 1 }),
      );
    });
  });

  describe('findByEvent', () => {
    it('should throw NotFoundException when event not found', async () => {
      eventRepo.findOne.mockResolvedValue(null);
      await expect(service.findByEvent('evt-uuid-1', 'usr-uuid-1')).rejects.toThrow(NotFoundException);
    });

    it('should return broadcasts ordered by createdAt DESC', async () => {
      eventRepo.findOne.mockResolvedValue(mockEvent);
      broadcastRepo.find.mockResolvedValue([mockBroadcast]);
      const result = await service.findByEvent('evt-uuid-1', 'usr-uuid-1');
      expect(result).toEqual([mockBroadcast]);
    });
  });
});
