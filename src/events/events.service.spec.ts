import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
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

describe('EventsService', () => {
  let service: EventsService;
  let repo: jest.Mocked<Repository<Event>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: getRepositoryToken(Event),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            findAndCount: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    repo = module.get(getRepositoryToken(Event));
  });

  describe('create', () => {
    const dto = {
      title: 'Festival Tech 2026',
      description: 'Maior festival de tecnologia.',
      startDate: '2026-06-01T00:00:00.000Z',
      endDate: '2026-06-02T00:00:00.000Z',
      startTime: '09:00',
      endTime: '18:00',
      workloadHours: 8,
    };

    it('should throw ForbiddenException when FREE organizer has 5+ active events', async () => {
      repo.count.mockResolvedValue(5);
      await expect(service.create(dto, mockOrganizer)).rejects.toThrow(ForbiddenException);
    });

    it('should create event for FREE organizer with fewer than 5 active events', async () => {
      repo.count.mockResolvedValue(2);
      repo.create.mockReturnValue({ ...mockEvent, id: 'new-evt' });
      repo.save.mockResolvedValue({ ...mockEvent, id: 'new-evt' });
      const result = await service.create(dto, mockOrganizer);
      expect(repo.save).toHaveBeenCalled();
      expect(result.id).toBe('new-evt');
    });

    it('should not limit PRO organizers by active event count', async () => {
      const proOrganizer = { ...mockOrganizer, plan: UserPlan.PRO };
      repo.create.mockReturnValue({ ...mockEvent, id: 'new-evt-pro' });
      repo.save.mockResolvedValue({ ...mockEvent, id: 'new-evt-pro' });
      const result = await service.create(dto, proOrganizer);
      expect(repo.count).not.toHaveBeenCalled();
      expect(result.id).toBe('new-evt-pro');
    });

    it('should generate a slug from the title', async () => {
      repo.count.mockResolvedValue(0);
      repo.create.mockImplementation((data) => data as Event);
      repo.save.mockImplementation(async (e) => e as Event);
      const result = await service.create(dto, mockOrganizer);
      expect(result.slug).toMatch(/^festival-tech-2026-[a-z0-9]{4}$/);
    });
  });

  describe('findMyEvents', () => {
    it('should return paginated list for the organizer', async () => {
      repo.findAndCount.mockResolvedValue([[mockEvent], 1]);
      const result = await service.findMyEvents('org-uuid-1', { page: 1, limit: 10 });
      expect(result).toEqual({ data: [mockEvent], total: 1, page: 1, limit: 10 });
    });

    it('should filter by status when provided', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);
      await service.findMyEvents('org-uuid-1', { page: 1, limit: 10, status: EventStatus.PUBLISHED });
      const call = repo.findAndCount.mock.calls[0][0] as { where: Record<string, unknown> };
      expect(call.where).toMatchObject({ status: EventStatus.PUBLISHED });
    });
  });

  describe('findOne', () => {
    it('should return event when organizer is the owner', async () => {
      repo.findOne.mockResolvedValue(mockEvent);
      const result = await service.findOne('evt-uuid-1', 'org-uuid-1');
      expect(result).toEqual(mockEvent);
    });

    it('should throw NotFoundException when event does not exist', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing', 'org-uuid-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when organizer is not the owner', async () => {
      repo.findOne.mockResolvedValue({ ...mockEvent, organizerId: 'other-org' });
      await expect(service.findOne('evt-uuid-1', 'org-uuid-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findBySlug', () => {
    it('should return the event for a valid public slug', async () => {
      repo.findOne.mockResolvedValue(mockEvent);
      const result = await service.findBySlug('festival-tech-2026-ab12');
      expect(result).toEqual(mockEvent);
    });

    it('should throw NotFoundException when slug not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findBySlug('nonexistent-slug')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update and save the event', async () => {
      repo.findOne.mockResolvedValue({ ...mockEvent });
      repo.save.mockResolvedValue({ ...mockEvent, title: 'Updated Title' });
      const result = await service.update('evt-uuid-1', 'org-uuid-1', { title: 'Updated Title' });
      expect(result.title).toBe('Updated Title');
    });
  });

  describe('cancel', () => {
    it('should set status to CANCELLED', async () => {
      repo.findOne.mockResolvedValue({ ...mockEvent });
      repo.save.mockResolvedValue({ ...mockEvent, status: EventStatus.CANCELLED });
      const result = await service.cancel('evt-uuid-1', 'org-uuid-1');
      expect(result.status).toBe(EventStatus.CANCELLED);
    });
  });

  describe('publish', () => {
    it('should set status to PUBLISHED', async () => {
      repo.findOne.mockResolvedValue({ ...mockEvent });
      repo.save.mockResolvedValue({ ...mockEvent, status: EventStatus.PUBLISHED });
      const result = await service.publish('evt-uuid-1', 'org-uuid-1');
      expect(result.status).toBe(EventStatus.PUBLISHED);
    });
  });

  describe('finish', () => {
    it('should set status to FINISHED', async () => {
      repo.findOne.mockResolvedValue({ ...mockEvent, status: EventStatus.PUBLISHED });
      repo.save.mockResolvedValue({ ...mockEvent, status: EventStatus.FINISHED });
      const result = await service.finish('evt-uuid-1', 'org-uuid-1');
      expect(result.status).toBe(EventStatus.FINISHED);
    });
  });

  describe('getStats', () => {
    it('should return zeroed stats for a fresh event', async () => {
      repo.findOne.mockResolvedValue(mockEvent);
      const stats = await service.getStats('evt-uuid-1', 'org-uuid-1');
      expect(stats).toEqual({
        totalParticipants: 0,
        totalCheckins: 0,
        attendanceRate: 0,
        certificatesIssued: 0,
      });
    });
  });

  describe('updateBanner', () => {
    it('should save bannerUrl and return updated event', async () => {
      repo.findOne.mockResolvedValue({ ...mockEvent });
      repo.save.mockResolvedValue({ ...mockEvent, bannerUrl: '/uploads/events/banner.jpg' });
      const result = await service.updateBanner('evt-uuid-1', 'org-uuid-1', '/uploads/events/banner.jpg');
      expect(result.bannerUrl).toBe('/uploads/events/banner.jpg');
    });
  });

  describe('updateLogo', () => {
    it('should save logoUrl and return updated event', async () => {
      repo.findOne.mockResolvedValue({ ...mockEvent });
      repo.save.mockResolvedValue({ ...mockEvent, logoUrl: '/uploads/events/logo.jpg' });
      const result = await service.updateLogo('evt-uuid-1', 'org-uuid-1', '/uploads/events/logo.jpg');
      expect(result.logoUrl).toBe('/uploads/events/logo.jpg');
    });
  });
});
