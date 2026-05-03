import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CertificateSignersService } from './certificate-signers.service';
import { CertificateSigner } from './certificate-signer.entity';
import { EventsService } from '../events/events.service';
import { Event, EventStatus, CertificateTemplate } from '../events/event.entity';

const mockEvent: Event = {
  id: 'evt-uuid-1',
  slug: 'evento-test',
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
  organizer: {} as never,
  tickets: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSigner: CertificateSigner = {
  id: 'sgn-uuid-1',
  eventId: 'evt-uuid-1',
  event: {} as never,
  name: 'Prof. Dr. João Silva',
  title: 'Coordenador',
  signatureUrl: null,
  displayOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('CertificateSignersService', () => {
  let service: CertificateSignersService;
  let repo: jest.Mocked<Repository<CertificateSigner>>;
  let eventsService: jest.Mocked<EventsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificateSignersService,
        {
          provide: getRepositoryToken(CertificateSigner),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: EventsService,
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<CertificateSignersService>(CertificateSignersService);
    repo = module.get(getRepositoryToken(CertificateSigner));
    eventsService = module.get(EventsService);
  });

  describe('create', () => {
    it('should create a signer after verifying event ownership', async () => {
      eventsService.findOne.mockResolvedValue(mockEvent);
      repo.count.mockResolvedValue(0);
      repo.create.mockReturnValue({ ...mockSigner });
      repo.save.mockResolvedValue({ ...mockSigner });

      const result = await service.create('evt-uuid-1', 'org-uuid-1', { name: 'Prof. Dr. João Silva', title: 'Coordenador' });

      expect(eventsService.findOne).toHaveBeenCalledWith('evt-uuid-1', 'org-uuid-1');
      expect(result.name).toBe('Prof. Dr. João Silva');
    });

    it('should throw BadRequestException when max 5 signers is reached', async () => {
      eventsService.findOne.mockResolvedValue(mockEvent);
      repo.count.mockResolvedValue(5);

      await expect(
        service.create('evt-uuid-1', 'org-uuid-1', { name: 'Extra', title: 'Cargo' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByEvent', () => {
    it('should return signers ordered by displayOrder', async () => {
      eventsService.findOne.mockResolvedValue(mockEvent);
      repo.find.mockResolvedValue([mockSigner]);

      const result = await service.findByEvent('evt-uuid-1', 'org-uuid-1');

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ order: { displayOrder: 'ASC' } }),
      );
      expect(result).toEqual([mockSigner]);
    });
  });

  describe('update', () => {
    it('should update signer name and title', async () => {
      eventsService.findOne.mockResolvedValue(mockEvent);
      repo.findOne.mockResolvedValue({ ...mockSigner });
      repo.save.mockResolvedValue({ ...mockSigner, title: 'Diretor' });

      const result = await service.update('evt-uuid-1', 'sgn-uuid-1', 'org-uuid-1', { title: 'Diretor' });

      expect(result.title).toBe('Diretor');
    });

    it('should throw NotFoundException when signer not found', async () => {
      eventsService.findOne.mockResolvedValue(mockEvent);
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.update('evt-uuid-1', 'wrong-id', 'org-uuid-1', { title: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSignature', () => {
    it('should save signatureUrl', async () => {
      eventsService.findOne.mockResolvedValue(mockEvent);
      repo.findOne.mockResolvedValue({ ...mockSigner });
      repo.save.mockResolvedValue({ ...mockSigner, signatureUrl: '/uploads/signatures/sig.png' });

      const result = await service.updateSignature('evt-uuid-1', 'sgn-uuid-1', 'org-uuid-1', '/uploads/signatures/sig.png');

      expect(result.signatureUrl).toBe('/uploads/signatures/sig.png');
    });
  });

  describe('remove', () => {
    it('should remove signer', async () => {
      eventsService.findOne.mockResolvedValue(mockEvent);
      repo.findOne.mockResolvedValue({ ...mockSigner });
      repo.remove.mockResolvedValue({ ...mockSigner });

      await service.remove('evt-uuid-1', 'sgn-uuid-1', 'org-uuid-1');

      expect(repo.remove).toHaveBeenCalled();
    });

    it('should throw NotFoundException when signer not found', async () => {
      eventsService.findOne.mockResolvedValue(mockEvent);
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.remove('evt-uuid-1', 'wrong-id', 'org-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
