import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { WhiteLabelController } from './white-label.controller';
import { WhiteLabelService } from './white-label.service';
import { UserPlan } from '../users/user.entity';
import { WhiteLabelConfig } from './white-label-config.entity';

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

const mockUser = { id: 'user-uuid-1', plan: UserPlan.ENTERPRISE } as any;

describe('WhiteLabelController', () => {
  let controller: WhiteLabelController;
  let service: jest.Mocked<WhiteLabelService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WhiteLabelController],
      providers: [
        {
          provide: WhiteLabelService,
          useValue: {
            getConfig: jest.fn(),
            updateConfig: jest.fn(),
            getByDomain: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(WhiteLabelController);
    service = module.get(WhiteLabelService);
  });

  describe('GET /account/white-label', () => {
    it('returns the white-label config for the current user', async () => {
      service.getConfig.mockResolvedValue(mockConfig);

      const result = await controller.getConfig(mockUser);

      expect(service.getConfig).toHaveBeenCalledWith('user-uuid-1');
      expect(result).toEqual(mockConfig);
    });
  });

  describe('PUT /account/white-label', () => {
    it('updates config and returns result', async () => {
      const updated = { ...mockConfig, primaryColor: '#ff0000' };
      service.updateConfig.mockResolvedValue(updated);

      const result = await controller.updateConfig(
        { primaryColor: '#ff0000' },
        mockUser,
      );

      expect(service.updateConfig).toHaveBeenCalledWith(
        'user-uuid-1',
        { primaryColor: '#ff0000' },
        UserPlan.ENTERPRISE,
      );
      expect(result.primaryColor).toBe('#ff0000');
    });

    it('propagates ForbiddenException when service throws', async () => {
      service.updateConfig.mockRejectedValue(new ForbiddenException());

      await expect(
        controller.updateConfig({ hidePoweredBy: true }, { ...mockUser, plan: UserPlan.FREE }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('GET /public/white-label', () => {
    it('returns config for a valid domain', async () => {
      const domainConfig = { ...mockConfig, customDomain: 'eventos.empresa.com' };
      service.getByDomain.mockResolvedValue(domainConfig);

      const result = await controller.getByDomain('eventos.empresa.com');

      expect(service.getByDomain).toHaveBeenCalledWith('eventos.empresa.com');
      expect(result).toEqual(domainConfig);
    });

    it('propagates NotFoundException for unknown domain', async () => {
      service.getByDomain.mockRejectedValue(new NotFoundException());

      await expect(controller.getByDomain('unknown.com')).rejects.toThrow(NotFoundException);
    });
  });
});
