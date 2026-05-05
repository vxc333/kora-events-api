import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CheckinService } from './checkin.service';
import { Participant, ParticipantStatus } from '../participants/participant.entity';
import { Event } from '../events/event.entity';

const mockEvent = { id: 'evt-uuid-1', organizerId: 'usr-uuid-1' } as Event;

const mockParticipant: Participant = {
  id: 'part-uuid-1',
  eventId: 'evt-uuid-1',
  event: {} as Event,
  ticketId: null,
  ticket: null,
  couponId: null,
  name: 'João Silva',
  email: 'joao@example.com',
  cpf: null,
  phone: null,
  status: ParticipantStatus.CONFIRMED,
  qrToken: 'abc-token-123',
  checkedInAt: null,
  certificateReleased: false,
  registeredAt: new Date(),
  updatedAt: new Date(),
};

describe('CheckinService', () => {
  let service: CheckinService;
  let participantRepo: jest.Mocked<Repository<Participant>>;
  let eventRepo: jest.Mocked<Repository<Event>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckinService,
        {
          provide: getRepositoryToken(Participant),
          useValue: { findOne: jest.fn(), save: jest.fn(), count: jest.fn() },
        },
        {
          provide: getRepositoryToken(Event),
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<CheckinService>(CheckinService);
    participantRepo = module.get(getRepositoryToken(Participant));
    eventRepo = module.get(getRepositoryToken(Event));
  });

  describe('checkin', () => {
    it('should set checkedInAt and return participant on valid token', async () => {
      participantRepo.findOne.mockResolvedValue({ ...mockParticipant });
      participantRepo.save.mockResolvedValue({ ...mockParticipant, checkedInAt: new Date() });

      const result = await service.checkin('abc-token-123');

      expect(participantRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ checkedInAt: expect.any(Date) }),
      );
      expect(result.checkedInAt).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException when token not found', async () => {
      participantRepo.findOne.mockResolvedValue(null);
      await expect(service.checkin('invalid-token')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when participant already checked in', async () => {
      participantRepo.findOne.mockResolvedValue({
        ...mockParticipant,
        checkedInAt: new Date('2026-04-30T14:30:00Z'),
      });
      await expect(service.checkin('abc-token-123')).rejects.toThrow(ConflictException);
    });

    it('should include HH:MM timestamp in ConflictException message', async () => {
      const checkedAt = new Date();
      participantRepo.findOne.mockResolvedValue({ ...mockParticipant, checkedInAt: checkedAt });

      try {
        await service.checkin('abc-token-123');
        fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ConflictException);
        expect((e as ConflictException).message).toMatch(/\d{2}:\d{2}/);
      }
    });
  });

  describe('getStats', () => {
    it('should return total, checkedIn and pending counts', async () => {
      eventRepo.findOne.mockResolvedValue(mockEvent);
      participantRepo.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(47);

      const result = await service.getStats('evt-uuid-1', 'usr-uuid-1');

      expect(result).toEqual({ total: 100, checkedIn: 47, pending: 53 });
    });

    it('should throw NotFoundException when event not found or not owned', async () => {
      eventRepo.findOne.mockResolvedValue(null);
      await expect(service.getStats('evt-uuid-1', 'other-user')).rejects.toThrow(NotFoundException);
    });
  });
});
