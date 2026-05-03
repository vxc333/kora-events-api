import { Test, TestingModule } from '@nestjs/testing';
import { EventPartnersController } from './event-partners.controller';
import { EventPartnersService } from './event-partners.service';
import { EventPartner } from './event-partner.entity';
import { User, UserPlan, UserRole } from '../users/user.entity';

const mockOrganizer: User = {
  id: 'org-uuid-1',
  name: 'Org',
  email: 'org@test.com',
  password: 'hashed',
  phone: null,
  avatarUrl: null,
  role: UserRole.ORGANIZER,
  isEmailVerified: true,
  refreshToken: null,
  passwordResetToken: null,
  passwordResetExpires: null,
  plan: UserPlan.FREE,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPartner: EventPartner = {
  id: 'partner-uuid-1',
  eventId: 'evt-uuid-1',
  event: {} as never,
  name: 'Empresa Parceira',
  logoUrl: null,
  displayOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('EventPartnersController', () => {
  let controller: EventPartnersController;
  let service: jest.Mocked<EventPartnersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventPartnersController],
      providers: [
        {
          provide: EventPartnersService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockPartner),
            findByEvent: jest.fn().mockResolvedValue([mockPartner]),
            update: jest.fn().mockResolvedValue({ ...mockPartner, name: 'Atualizado' }),
            updateLogo: jest.fn().mockResolvedValue({ ...mockPartner, logoUrl: '/uploads/partners/logo.jpg' }),
            remove: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<EventPartnersController>(EventPartnersController);
    service = module.get(EventPartnersService);
  });

  it('create delegates to service with eventId and organizerId', async () => {
    const dto = { name: 'Empresa Parceira' };
    const result = await controller.create('evt-uuid-1', mockOrganizer, dto);
    expect(service.create).toHaveBeenCalledWith('evt-uuid-1', 'org-uuid-1', dto);
    expect(result).toEqual(mockPartner);
  });

  it('findByEvent returns ordered partners', async () => {
    const result = await controller.findByEvent('evt-uuid-1', mockOrganizer);
    expect(service.findByEvent).toHaveBeenCalledWith('evt-uuid-1', 'org-uuid-1');
    expect(result).toEqual([mockPartner]);
  });

  it('update delegates to service', async () => {
    const dto = { name: 'Atualizado' };
    const result = await controller.update('evt-uuid-1', 'partner-uuid-1', mockOrganizer, dto);
    expect(service.update).toHaveBeenCalledWith('evt-uuid-1', 'partner-uuid-1', 'org-uuid-1', dto);
    expect(result.name).toBe('Atualizado');
  });

  it('remove delegates to service', async () => {
    await controller.remove('evt-uuid-1', 'partner-uuid-1', mockOrganizer);
    expect(service.remove).toHaveBeenCalledWith('evt-uuid-1', 'partner-uuid-1', 'org-uuid-1');
  });
});
