import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, HttpException, NotFoundException } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { Coupon, DiscountType } from './coupon.entity';
import { EventsService } from '../events/events.service';
import { Event, EventStatus, CertificateTemplate } from '../events/event.entity';
import { User, UserPlan, UserRole } from '../users/user.entity';

const mockOrganizer: User = {
  id: 'org-uuid-1', name: 'Org', email: 'org@test.com', password: 'hashed',
  phone: null, avatarUrl: null, role: UserRole.ORGANIZER, isEmailVerified: true,
  refreshToken: null, passwordResetToken: null, passwordResetExpires: null,
  plan: UserPlan.FREE, createdAt: new Date(), updatedAt: new Date(),
};

const mockEvent: Event = {
  id: 'evt-uuid-1', slug: 'evento-ab12', title: 'Evento', description: 'Desc',
  bannerUrl: null, logoUrl: null, startDate: new Date(), endDate: new Date(),
  startTime: '09:00', endTime: '18:00', location: null, onlineLink: null,
  isOnline: false, minimumAttendancePercentage: 75, workloadHours: 8,
  status: EventStatus.DRAFT, isPublic: true, requiresApproval: false,
  maxParticipants: null, hasPaidTickets: false, primaryColor: '#6366f1',
  certificateTemplate: CertificateTemplate.DEFAULT, organizerId: 'org-uuid-1',
  organizer: mockOrganizer, tickets: [], createdAt: new Date(), updatedAt: new Date(),
};

const mockCoupon: Coupon = {
  id: 'cpn-uuid-1', eventId: 'evt-uuid-1', event: mockEvent,
  code: 'KORA10', discountType: DiscountType.PERCENTAGE, discountValue: 10,
  maxUses: 50, usedCount: 0, isActive: true, expiresAt: null,
  usages: [], createdAt: new Date(), updatedAt: new Date(),
};

describe('CouponsService', () => {
  let service: CouponsService;
  let repo: jest.Mocked<Repository<Coupon>>;
  let eventsService: jest.Mocked<EventsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponsService,
        {
          provide: getRepositoryToken(Coupon),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: EventsService,
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<CouponsService>(CouponsService);
    repo = module.get(getRepositoryToken(Coupon));
    eventsService = module.get(EventsService);
  });

  describe('create', () => {
    it('should create a PERCENTAGE coupon after verifying ownership', async () => {
      eventsService.findOne.mockResolvedValue(mockEvent);
      repo.create.mockReturnValue({ ...mockCoupon });
      repo.save.mockResolvedValue({ ...mockCoupon });
      const result = await service.create('evt-uuid-1', 'org-uuid-1', {
        code: 'KORA10', discountType: DiscountType.PERCENTAGE, discountValue: 10,
      });
      expect(eventsService.findOne).toHaveBeenCalledWith('evt-uuid-1', 'org-uuid-1');
      expect(result.code).toBe('KORA10');
    });

    it('should throw BadRequestException when PERCENTAGE discountValue > 100', async () => {
      eventsService.findOne.mockResolvedValue(mockEvent);
      await expect(
        service.create('evt-uuid-1', 'org-uuid-1', {
          code: 'BAD', discountType: DiscountType.PERCENTAGE, discountValue: 110,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when PERCENTAGE discountValue < 1', async () => {
      eventsService.findOne.mockResolvedValue(mockEvent);
      await expect(
        service.create('evt-uuid-1', 'org-uuid-1', {
          code: 'BAD', discountType: DiscountType.PERCENTAGE, discountValue: 0,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a FIXED coupon', async () => {
      eventsService.findOne.mockResolvedValue(mockEvent);
      const fixedCoupon = { ...mockCoupon, discountType: DiscountType.FIXED, discountValue: 20 };
      repo.create.mockReturnValue(fixedCoupon);
      repo.save.mockResolvedValue(fixedCoupon);
      const result = await service.create('evt-uuid-1', 'org-uuid-1', {
        code: 'FIXED20', discountType: DiscountType.FIXED, discountValue: 20,
      });
      expect(result.discountType).toBe(DiscountType.FIXED);
    });
  });

  describe('validate', () => {
    it('should return coupon for a valid code', async () => {
      repo.findOne.mockResolvedValue(mockCoupon);
      const result = await service.validate('evt-uuid-1', 'KORA10');
      expect(result).toEqual(mockCoupon);
    });

    it('should throw 404 when code not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.validate('evt-uuid-1', 'INVALID')).rejects.toThrow(NotFoundException);
    });

    it('should throw 422 COUPON_INACTIVE when isActive is false', async () => {
      repo.findOne.mockResolvedValue({ ...mockCoupon, isActive: false });
      try {
        await service.validate('evt-uuid-1', 'KORA10');
      } catch (e: unknown) {
        expect((e as HttpException).getStatus()).toBe(422);
        expect(((e as HttpException).getResponse() as { code: string }).code).toBe('COUPON_INACTIVE');
      }
    });

    it('should throw 422 COUPON_EXPIRED when expiresAt is in the past', async () => {
      const past = new Date('2020-01-01');
      repo.findOne.mockResolvedValue({ ...mockCoupon, expiresAt: past });
      try {
        await service.validate('evt-uuid-1', 'KORA10');
      } catch (e: unknown) {
        expect((e as HttpException).getStatus()).toBe(422);
        expect(((e as HttpException).getResponse() as { code: string }).code).toBe('COUPON_EXPIRED');
      }
    });

    it('should throw 422 COUPON_LIMIT_REACHED when usedCount >= maxUses', async () => {
      repo.findOne.mockResolvedValue({ ...mockCoupon, maxUses: 10, usedCount: 10 });
      try {
        await service.validate('evt-uuid-1', 'KORA10');
      } catch (e: unknown) {
        expect((e as HttpException).getStatus()).toBe(422);
        expect(((e as HttpException).getResponse() as { code: string }).code).toBe('COUPON_LIMIT_REACHED');
      }
    });
  });

  describe('findByEvent', () => {
    it('should return coupons for event', async () => {
      eventsService.findOne.mockResolvedValue(mockEvent);
      repo.find.mockResolvedValue([mockCoupon]);
      const result = await service.findByEvent('evt-uuid-1', 'org-uuid-1');
      expect(result).toEqual([mockCoupon]);
    });
  });

  describe('update', () => {
    it('should update coupon fields (not code)', async () => {
      eventsService.findOne.mockResolvedValue(mockEvent);
      repo.findOne.mockResolvedValue({ ...mockCoupon });
      repo.save.mockResolvedValue({ ...mockCoupon, maxUses: 100 });
      const result = await service.update('evt-uuid-1', 'cpn-uuid-1', 'org-uuid-1', { maxUses: 100 });
      expect(result.maxUses).toBe(100);
    });

    it('should throw NotFoundException when coupon not found', async () => {
      eventsService.findOne.mockResolvedValue(mockEvent);
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.update('evt-uuid-1', 'wrong', 'org-uuid-1', { maxUses: 5 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivate', () => {
    it('should set isActive to false (soft delete)', async () => {
      eventsService.findOne.mockResolvedValue(mockEvent);
      repo.findOne.mockResolvedValue({ ...mockCoupon });
      repo.save.mockResolvedValue({ ...mockCoupon, isActive: false });
      const result = await service.deactivate('evt-uuid-1', 'cpn-uuid-1', 'org-uuid-1');
      expect(result.isActive).toBe(false);
    });
  });
});
