import { Test, TestingModule } from '@nestjs/testing';
import { CouponsController } from './coupons.controller';
import { CouponsService } from './coupons.service';
import { Coupon, DiscountType } from './coupon.entity';
import { User, UserPlan, UserRole } from '../users/user.entity';

const mockOrganizer: User = {
  id: 'org-uuid-1', name: 'Org', email: 'org@test.com', password: 'hashed',
  phone: null, avatarUrl: null, role: UserRole.ORGANIZER, isEmailVerified: true,
  refreshToken: null, passwordResetToken: null, passwordResetExpires: null,
  plan: UserPlan.FREE, createdAt: new Date(), updatedAt: new Date(),
};

const mockCoupon: Coupon = {
  id: 'cpn-uuid-1', eventId: 'evt-uuid-1', event: {} as never,
  code: 'KORA10', discountType: DiscountType.PERCENTAGE, discountValue: 10,
  maxUses: 50, usedCount: 3, isActive: true, expiresAt: null,
  usages: [], createdAt: new Date(), updatedAt: new Date(),
};

describe('CouponsController', () => {
  let controller: CouponsController;
  let service: jest.Mocked<CouponsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CouponsController],
      providers: [
        {
          provide: CouponsService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockCoupon),
            findByEvent: jest.fn().mockResolvedValue([mockCoupon]),
            validate: jest.fn().mockResolvedValue(mockCoupon),
            update: jest.fn().mockResolvedValue({ ...mockCoupon, maxUses: 100 }),
            deactivate: jest.fn().mockResolvedValue({ ...mockCoupon, isActive: false }),
          },
        },
      ],
    }).compile();

    controller = module.get<CouponsController>(CouponsController);
    service = module.get(CouponsService);
  });

  it('create delegates to service', async () => {
    const dto = { code: 'KORA10', discountType: DiscountType.PERCENTAGE, discountValue: 10 };
    const result = await controller.create('evt-uuid-1', mockOrganizer, dto);
    expect(service.create).toHaveBeenCalledWith('evt-uuid-1', 'org-uuid-1', dto);
    expect(result.code).toBe('KORA10');
  });

  it('findByEvent delegates to service', async () => {
    const result = await controller.findByEvent('evt-uuid-1', mockOrganizer);
    expect(service.findByEvent).toHaveBeenCalledWith('evt-uuid-1', 'org-uuid-1');
    expect(result).toEqual([mockCoupon]);
  });

  it('validate delegates to service (public)', async () => {
    const result = await controller.validate('evt-uuid-1', { code: 'KORA10' });
    expect(service.validate).toHaveBeenCalledWith('evt-uuid-1', 'KORA10');
    expect(result).toEqual(mockCoupon);
  });

  it('update delegates to service', async () => {
    const dto = { maxUses: 100 };
    const result = await controller.update('evt-uuid-1', 'cpn-uuid-1', mockOrganizer, dto);
    expect(service.update).toHaveBeenCalledWith('evt-uuid-1', 'cpn-uuid-1', 'org-uuid-1', dto);
    expect(result.maxUses).toBe(100);
  });

  it('deactivate delegates to service', async () => {
    const result = await controller.deactivate('evt-uuid-1', 'cpn-uuid-1', mockOrganizer);
    expect(service.deactivate).toHaveBeenCalledWith('evt-uuid-1', 'cpn-uuid-1', 'org-uuid-1');
    expect(result.isActive).toBe(false);
  });
});
