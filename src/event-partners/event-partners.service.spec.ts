import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventPartnersService } from './event-partners.service';
import { EventPartner } from './event-partner.entity';
import { EventsService } from '../events/events.service';
import { Event, EventStatus, CertificateTemplate } from '../events/event.entity';
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

const mockEvent: Event = {
  id: 'evt-uuid-1',
  slug: 'evento-test-ab12',
  title: 'Evento Test',
  description: 'Desc',
  bannerUrl: null,
  logoUrl: null,
  startDate: new Date(),
  endDate: new Date(),
  startTime: '09:00',
  endTime: '18:00',
  location: null,
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

const mockPartner: EventPartner = {
  id: 'partner-uuid-1',
  eventId: 'evt-uuid-1',
  event: mockEvent,
  name: 'Empresa Parceira',
  logoUrl: null,
  displayOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('EventPartnersService', () => {
  let service: EventPartnersService;
  let repo: jest.Mocked<Repository<EventPartner>>;
  let eventsService: jest.Mocked<EventsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventPartnersService,
        {
          provide: getRepositoryToken(EventPartner),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: EventsService,
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EventPartnersService>(EventPartnersService);
    repo = module.get(getRepositoryToken(EventPartner));
    eventsService = module.get(EventsService);
  });

  describe('create', () => {
    it('should create a partner after verifying event ownership', async () => {
      eventsService.findOne.mockResolvedValue(mockEvent);
      repo.create.mockReturnValue({ ...mockPartner });
      repo.save.mockResolvedValue({ ...mockPartner });
      const result = await service.create('evt-uuid-1', 'org-uuid-1', { name: 'Empresa Parceira' });
      expect(eventsService.findOne).toHaveBeenCalledWith('evt-uuid-1', 'org-uuid-1');
      expect(result.name).toBe('Empresa Parceira');
    });
  });

  describe('findByEvent', () => {
    it('should return partners ordered by displayOrder', async () => {
      repo.find.mockResolvedValue([mockPartner]);
      const result = await service.findByEvent('evt-uuid-1', 'org-uuid-1');
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ order: { displayOrder: 'ASC' } }),
      );
      expect(result).toEqual([mockPartner]);
    });
  });

  describe('update', () => {
    it('should update partner after verifying event ownership', async () => {
      eventsService.findOne.mockResolvedValue(mockEvent);
      repo.findOne.mockResolvedValue({ ...mockPartner });
      repo.save.mockResolvedValue({ ...mockPartner, name: 'Atualizado' });
      const result = await service.update('evt-uuid-1', 'partner-uuid-1', 'org-uuid-1', { name: 'Atualizado' });
      expect(result.name).toBe('Atualizado');
    });

    it('should throw NotFoundException when partner not found', async () => {
      eventsService.findOne.mockResolvedValue(mockEvent);
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.update('evt-uuid-1', 'wrong-id', 'org-uuid-1', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateLogo', () => {
    it('should save logoUrl', async () => {
      eventsService.findOne.mockResolvedValue(mockEvent);
      repo.findOne.mockResolvedValue({ ...mockPartner });
      repo.save.mockResolvedValue({ ...mockPartner, logoUrl: '/uploads/partners/logo.jpg' });
      const result = await service.updateLogo('evt-uuid-1', 'partner-uuid-1', 'org-uuid-1', '/uploads/partners/logo.jpg');
      expect(result.logoUrl).toBe('/uploads/partners/logo.jpg');
    });
  });

  describe('remove', () => {
    it('should remove partner', async () => {
      eventsService.findOne.mockResolvedValue(mockEvent);
      repo.findOne.mockResolvedValue({ ...mockPartner });
      repo.remove.mockResolvedValue({ ...mockPartner });
      await service.remove('evt-uuid-1', 'partner-uuid-1', 'org-uuid-1');
      expect(repo.remove).toHaveBeenCalled();
    });
  });
});
