import { Test, TestingModule } from '@nestjs/testing';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { Event, EventStatus, CertificateTemplate } from './event.entity';
import { User, UserPlan, UserRole } from '../users/user.entity';

const mockOrganizer: User = {
  id: 'org-uuid-1',
  name: 'João Org',
  email: 'joao@example.com',
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

const mockEvent: Event = {
  id: 'evt-uuid-1',
  slug: 'festival-tech-2026-ab12',
  title: 'Festival Tech 2026',
  description: 'Maior festival de tecnologia.',
  bannerUrl: null,
  logoUrl: null,
  startDate: new Date('2026-06-01'),
  endDate: new Date('2026-06-02'),
  startTime: '09:00',
  endTime: '18:00',
  location: 'São Paulo',
  onlineLink: null,
  isOnline: false,
  minimumAttendancePercentage: 75,
  workloadHours: 8,
  status: EventStatus.DRAFT,
  isPublic: true,
  requiresApproval: false,
  maxParticipants: null,
  hasPaidTickets: false,
  primaryColor: '#6366f1',
  certificateTemplate: CertificateTemplate.DEFAULT,
  organizerId: 'org-uuid-1',
  organizer: mockOrganizer,
  tickets: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockStats = {
  totalParticipants: 0,
  totalCheckins: 0,
  attendanceRate: 0,
  certificatesIssued: 0,
};

describe('EventsController', () => {
  let controller: EventsController;
  let service: jest.Mocked<EventsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        {
          provide: EventsService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockEvent),
            findMyEvents: jest.fn().mockResolvedValue({ data: [mockEvent], total: 1, page: 1, limit: 10 }),
            findOne: jest.fn().mockResolvedValue(mockEvent),
            findBySlug: jest.fn().mockResolvedValue(mockEvent),
            update: jest.fn().mockResolvedValue(mockEvent),
            cancel: jest.fn().mockResolvedValue({ ...mockEvent, status: EventStatus.CANCELLED }),
            publish: jest.fn().mockResolvedValue({ ...mockEvent, status: EventStatus.PUBLISHED }),
            finish: jest.fn().mockResolvedValue({ ...mockEvent, status: EventStatus.FINISHED }),
            getStats: jest.fn().mockResolvedValue(mockStats),
            updateBanner: jest.fn().mockResolvedValue({ ...mockEvent, bannerUrl: '/uploads/events/banner.jpg' }),
            updateLogo: jest.fn().mockResolvedValue({ ...mockEvent, logoUrl: '/uploads/events/logo.jpg' }),
          },
        },
      ],
    }).compile();

    controller = module.get<EventsController>(EventsController);
    service = module.get(EventsService);
  });

  it('create should delegate to service and return the new event', async () => {
    const dto = {
      title: 'Festival Tech 2026',
      description: 'Desc',
      startDate: '2026-06-01T00:00:00.000Z',
      endDate: '2026-06-02T00:00:00.000Z',
      startTime: '09:00',
      endTime: '18:00',
      workloadHours: 8,
    };
    const result = await controller.create(mockOrganizer, dto);
    expect(service.create).toHaveBeenCalledWith(dto, mockOrganizer);
    expect(result).toEqual(mockEvent);
  });

  it('findMyEvents should pass organizer id, page, limit, and status to service', async () => {
    await controller.findMyEvents(mockOrganizer, '1', '10', EventStatus.DRAFT);
    expect(service.findMyEvents).toHaveBeenCalledWith('org-uuid-1', { page: 1, limit: 10, status: EventStatus.DRAFT });
  });

  it('findOne should return the event owned by the organizer', async () => {
    const result = await controller.findOne('evt-uuid-1', mockOrganizer);
    expect(service.findOne).toHaveBeenCalledWith('evt-uuid-1', 'org-uuid-1');
    expect(result).toEqual(mockEvent);
  });

  it('findBySlug should return event for public page', async () => {
    const result = await controller.findBySlug('festival-tech-2026-ab12');
    expect(service.findBySlug).toHaveBeenCalledWith('festival-tech-2026-ab12');
    expect(result).toEqual(mockEvent);
  });

  it('update should delegate to service', async () => {
    const dto = { title: 'New Title' };
    await controller.update('evt-uuid-1', mockOrganizer, dto);
    expect(service.update).toHaveBeenCalledWith('evt-uuid-1', 'org-uuid-1', dto);
  });

  it('cancel should set status to CANCELLED', async () => {
    const result = await controller.cancel('evt-uuid-1', mockOrganizer);
    expect(result.status).toBe(EventStatus.CANCELLED);
  });

  it('publish should set status to PUBLISHED', async () => {
    const result = await controller.publish('evt-uuid-1', mockOrganizer);
    expect(result.status).toBe(EventStatus.PUBLISHED);
  });

  it('finish should set status to FINISHED', async () => {
    const result = await controller.finish('evt-uuid-1', mockOrganizer);
    expect(result.status).toBe(EventStatus.FINISHED);
  });

  it('getStats should return event statistics', async () => {
    const result = await controller.getStats('evt-uuid-1', mockOrganizer);
    expect(result).toEqual(mockStats);
  });
});
