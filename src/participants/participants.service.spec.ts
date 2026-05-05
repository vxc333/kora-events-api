import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, HttpException, NotFoundException } from '@nestjs/common';
import { ParticipantsService } from './participants.service';
import { Participant, ParticipantStatus } from './participant.entity';
import { Ticket } from '../tickets/ticket.entity';
import { Coupon, DiscountType } from '../coupons/coupon.entity';
import { CouponUsage } from '../coupons/coupon-usage.entity';

const mockTicket: Ticket = {
  id: 'tkt-uuid-1', name: 'Ingresso Padrão', description: null, price: 0,
  currency: 'BRL', quantity: 10, quantitySold: 5, isActive: true,
  salesStartDate: null, salesEndDate: null, isHalfPrice: false,
  discountCode: null, discountPercentage: null, eventId: 'evt-uuid-1',
  event: {} as never, createdAt: new Date(), updatedAt: new Date(),
};

const mockCoupon: Coupon = {
  id: 'cpn-uuid-1', eventId: 'evt-uuid-1', event: {} as never,
  code: 'KORA10', discountType: DiscountType.PERCENTAGE, discountValue: 10,
  maxUses: 50, usedCount: 0, isActive: true, expiresAt: null,
  usages: [], createdAt: new Date(), updatedAt: new Date(),
};

const mockParticipant: Participant = {
  id: 'part-uuid-1', eventId: 'evt-uuid-1', event: {} as never,
  ticketId: 'tkt-uuid-1', ticket: mockTicket, couponId: null,
  name: 'João da Silva', email: 'joao@example.com', cpf: null, phone: null,
  status: ParticipantStatus.PENDING,
  qrToken: 'mock-qr-token-uuid', checkedInAt: null, certificateReleased: false,
  registeredAt: new Date(), updatedAt: new Date(),
};

describe('ParticipantsService', () => {
  let service: ParticipantsService;
  let participantRepo: jest.Mocked<Repository<Participant>>;
  let ticketRepo: jest.Mocked<Repository<Ticket>>;
  let couponRepo: jest.Mocked<Repository<Coupon>>;
  let couponUsageRepo: jest.Mocked<Repository<CouponUsage>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParticipantsService,
        {
          provide: getRepositoryToken(Participant),
          useValue: { findOne: jest.fn(), find: jest.fn(), findAndCount: jest.fn(), create: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(Ticket),
          useValue: { findOne: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(Coupon),
          useValue: { findOne: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(CouponUsage),
          useValue: { create: jest.fn(), save: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ParticipantsService>(ParticipantsService);
    participantRepo = module.get(getRepositoryToken(Participant));
    ticketRepo = module.get(getRepositoryToken(Ticket));
    couponRepo = module.get(getRepositoryToken(Coupon));
    couponUsageRepo = module.get(getRepositoryToken(CouponUsage));
  });

  const baseDto = { name: 'João', email: 'joao@example.com', cpf: '529.982.247-25', phone: '(11) 91234-5678' };

  describe('register', () => {
    it('should throw 409 PARTICIPANT_ALREADY_REGISTERED when email already exists for event', async () => {
      participantRepo.findOne.mockResolvedValue(mockParticipant);
      await expect(
        service.register('evt-uuid-1', { ...baseDto }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw 409 TICKET_SOLD_OUT when ticket is at capacity', async () => {
      participantRepo.findOne.mockResolvedValue(null);
      ticketRepo.findOne.mockResolvedValue({ ...mockTicket, quantity: 10, quantitySold: 10 });
      try {
        await service.register('evt-uuid-1', { ...baseDto, ticketId: 'tkt-uuid-1' });
      } catch (e: unknown) {
        expect((e as HttpException).getStatus()).toBe(409);
        expect(((e as HttpException).getResponse() as { code: string }).code).toBe('TICKET_SOLD_OUT');
      }
    });

    it('should register and increment quantitySold when ticket has capacity', async () => {
      participantRepo.findOne.mockResolvedValue(null);
      ticketRepo.findOne.mockResolvedValue({ ...mockTicket, quantity: 10, quantitySold: 5 });
      participantRepo.create.mockReturnValue({ ...mockParticipant });
      participantRepo.save.mockResolvedValue({ ...mockParticipant });
      ticketRepo.save.mockResolvedValue({ ...mockTicket, quantitySold: 6 });

      await service.register('evt-uuid-1', { ...baseDto, ticketId: 'tkt-uuid-1' });
      expect(ticketRepo.save).toHaveBeenCalledWith(expect.objectContaining({ quantitySold: 6 }));
    });

    it('should register without ticket', async () => {
      participantRepo.findOne.mockResolvedValue(null);
      participantRepo.create.mockReturnValue({ ...mockParticipant, ticketId: null });
      participantRepo.save.mockResolvedValue({ ...mockParticipant, ticketId: null });
      await service.register('evt-uuid-1', { ...baseDto });
      expect(ticketRepo.findOne).not.toHaveBeenCalled();
    });

    it('should generate a unique qrToken on registration', async () => {
      participantRepo.findOne.mockResolvedValue(null);
      participantRepo.create.mockReturnValue({ ...mockParticipant });
      participantRepo.save.mockResolvedValue({ ...mockParticipant });
      await service.register('evt-uuid-1', { ...baseDto });
      expect(participantRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ qrToken: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/) }),
      );
    });

    it('should allow registration when ticket quantity is null (unlimited)', async () => {
      participantRepo.findOne.mockResolvedValue(null);
      ticketRepo.findOne.mockResolvedValue({ ...mockTicket, quantity: null, quantitySold: 9999 });
      participantRepo.create.mockReturnValue({ ...mockParticipant });
      participantRepo.save.mockResolvedValue({ ...mockParticipant });
      ticketRepo.save.mockResolvedValue({ ...mockTicket, quantitySold: 10000 });
      await service.register('evt-uuid-1', { ...baseDto, ticketId: 'tkt-uuid-1' });
      expect(participantRepo.save).toHaveBeenCalled();
    });

    it('should apply coupon: increment usedCount and create CouponUsage', async () => {
      participantRepo.findOne.mockResolvedValue(null);
      couponRepo.findOne.mockResolvedValue({ ...mockCoupon });
      participantRepo.create.mockReturnValue({ ...mockParticipant, couponId: 'cpn-uuid-1' });
      participantRepo.save.mockResolvedValue({ ...mockParticipant, couponId: 'cpn-uuid-1' });
      couponRepo.save.mockResolvedValue({ ...mockCoupon, usedCount: 1 });
      couponUsageRepo.create.mockReturnValue({} as CouponUsage);
      couponUsageRepo.save.mockResolvedValue({} as CouponUsage);

      await service.register('evt-uuid-1', { ...baseDto, couponCode: 'KORA10' });

      expect(couponRepo.save).toHaveBeenCalledWith(expect.objectContaining({ usedCount: 1 }));
      expect(couponUsageRepo.save).toHaveBeenCalled();
    });

    it('should throw 422 COUPON_INACTIVE when coupon is inactive', async () => {
      participantRepo.findOne.mockResolvedValue(null);
      couponRepo.findOne.mockResolvedValue({ ...mockCoupon, isActive: false });
      try {
        await service.register('evt-uuid-1', { ...baseDto, couponCode: 'KORA10' });
      } catch (e: unknown) {
        expect((e as HttpException).getStatus()).toBe(422);
        expect(((e as HttpException).getResponse() as { code: string }).code).toBe('COUPON_INACTIVE');
      }
    });

    it('should throw 422 COUPON_LIMIT_REACHED when coupon is exhausted', async () => {
      participantRepo.findOne.mockResolvedValue(null);
      couponRepo.findOne.mockResolvedValue({ ...mockCoupon, maxUses: 10, usedCount: 10 });
      try {
        await service.register('evt-uuid-1', { ...baseDto, couponCode: 'KORA10' });
      } catch (e: unknown) {
        expect((e as HttpException).getStatus()).toBe(422);
        expect(((e as HttpException).getResponse() as { code: string }).code).toBe('COUPON_LIMIT_REACHED');
      }
    });
  });

  describe('cancel', () => {
    it('should set status to CANCELLED and decrement quantitySold', async () => {
      participantRepo.findOne.mockResolvedValue({ ...mockParticipant });
      ticketRepo.findOne.mockResolvedValue({ ...mockTicket, quantitySold: 5 });
      participantRepo.save.mockResolvedValue({ ...mockParticipant, status: ParticipantStatus.CANCELLED });
      ticketRepo.save.mockResolvedValue({ ...mockTicket, quantitySold: 4 });
      const result = await service.cancel('evt-uuid-1', 'part-uuid-1');
      expect(ticketRepo.save).toHaveBeenCalledWith(expect.objectContaining({ quantitySold: 4 }));
      expect(result.status).toBe(ParticipantStatus.CANCELLED);
    });

    it('should not decrement quantitySold when participant has no ticket', async () => {
      participantRepo.findOne.mockResolvedValue({ ...mockParticipant, ticketId: null });
      participantRepo.save.mockResolvedValue({ ...mockParticipant, ticketId: null, status: ParticipantStatus.CANCELLED });
      await service.cancel('evt-uuid-1', 'part-uuid-1');
      expect(ticketRepo.findOne).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when participant not found', async () => {
      participantRepo.findOne.mockResolvedValue(null);
      await expect(service.cancel('evt-uuid-1', 'part-uuid-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated list', async () => {
      participantRepo.findAndCount.mockResolvedValue([[mockParticipant], 1]);
      const result = await service.findAll('evt-uuid-1', { page: 1, limit: 20 });
      expect(result).toEqual({ data: [mockParticipant], total: 1, page: 1, limit: 20 });
    });
  });

  describe('findOne', () => {
    it('should return participant', async () => {
      participantRepo.findOne.mockResolvedValue(mockParticipant);
      const result = await service.findOne('evt-uuid-1', 'part-uuid-1');
      expect(result).toEqual(mockParticipant);
    });

    it('should throw NotFoundException when not found', async () => {
      participantRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('evt-uuid-1', 'missing')).rejects.toThrow(NotFoundException);
    });
  });
});
