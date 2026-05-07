import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { WhiteLabelService } from './white-label.service';
import { WhiteLabelConfig } from './white-label-config.entity';
import { UserPlan } from '../users/user.entity';

const mockConfig: WhiteLabelConfig = {
  id: 'wl-uuid-1',
  userId: 'user-uuid-1',
  customDomain: null,
  logoUrl: null,
  primaryColor: null,
  accentColor: null,
  hidePoweredBy: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('WhiteLabelService', () => {
  let service: WhiteLabelService;
  let repo: jest.Mocked<Repository<WhiteLabelConfig>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhiteLabelService,
        {
          provide: getRepositoryToken(WhiteLabelConfig),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(WhiteLabelService);
    repo = module.get(getRepositoryToken(WhiteLabelConfig));
  });

  describe('getConfig', () => {
    it('returns existing config for user', async () => {
      repo.findOne.mockResolvedValue(mockConfig);

      const result = await service.getConfig('user-uuid-1');

      expect(result).toEqual(mockConfig);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { userId: 'user-uuid-1' } });
    });

    it('creates and returns default config when none exists', async () => {
      repo.findOne.mockResolvedValue(null);
      const created = { ...mockConfig };
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);

      const result = await service.getConfig('user-uuid-1');

      expect(repo.create).toHaveBeenCalledWith({ userId: 'user-uuid-1' });
      expect(repo.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });
  });

  describe('updateConfig', () => {
    it('throws ForbiddenException when user plan is FREE', async () => {
      await expect(
        service.updateConfig('user-uuid-1', { hidePoweredBy: true }, UserPlan.FREE),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when user plan is PRO', async () => {
      await expect(
        service.updateConfig('user-uuid-1', { primaryColor: '#ff0000' }, UserPlan.PRO),
      ).rejects.toThrow(ForbiddenException);
    });

    it('saves updated config for ENTERPRISE user', async () => {
      repo.findOne.mockResolvedValue({ ...mockConfig });
      repo.save.mockResolvedValue({ ...mockConfig, primaryColor: '#ff0000' });

      const result = await service.updateConfig(
        'user-uuid-1',
        { primaryColor: '#ff0000' },
        UserPlan.ENTERPRISE,
      );

      expect(repo.save).toHaveBeenCalled();
      expect(result.primaryColor).toBe('#ff0000');
    });

    it('creates config if not exists when ENTERPRISE user updates', async () => {
      repo.findOne.mockResolvedValue(null);
      const newConfig = { ...mockConfig, primaryColor: '#123456' };
      repo.create.mockReturnValue(newConfig);
      repo.save.mockResolvedValue(newConfig);

      const result = await service.updateConfig(
        'user-uuid-1',
        { primaryColor: '#123456' },
        UserPlan.ENTERPRISE,
      );

      expect(result.primaryColor).toBe('#123456');
    });
  });

  describe('getByDomain', () => {
    it('returns config for a registered custom domain', async () => {
      const configWithDomain = { ...mockConfig, customDomain: 'eventos.empresa.com' };
      repo.findOne.mockResolvedValue(configWithDomain);

      const result = await service.getByDomain('eventos.empresa.com');

      expect(result).toEqual(configWithDomain);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { customDomain: 'eventos.empresa.com' },
      });
    });

    it('throws NotFoundException for unknown domain', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.getByDomain('desconhecido.com')).rejects.toThrow(NotFoundException);
    });
  });
});
