import { Test, TestingModule } from '@nestjs/testing';
import { PushNotificationsController } from './push-notifications.controller';
import { PushNotificationsService } from './push-notifications.service';
import { PushToken } from './push-token.entity';
import { RegisterTokenDto } from './dto/register-token.dto';

const mockPushToken = (): PushToken => ({
  id: 'pt-uuid-1',
  fcmToken: 'fcm-token-abc',
  userId: null,
  qrToken: 'qr-abc',
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('PushNotificationsController', () => {
  let controller: PushNotificationsController;
  let service: jest.Mocked<PushNotificationsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PushNotificationsController],
      providers: [
        {
          provide: PushNotificationsService,
          useValue: {
            registerToken: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PushNotificationsController>(PushNotificationsController);
    service = module.get(PushNotificationsService);
  });

  describe('POST /push-tokens', () => {
    it('should call service.registerToken and return the created PushToken', async () => {
      const dto: RegisterTokenDto = { fcmToken: 'fcm-token-abc', qrToken: 'qr-abc' };
      const token = mockPushToken();
      service.registerToken.mockResolvedValue(token);

      const result = await controller.register(dto);

      expect(service.registerToken).toHaveBeenCalledWith(dto);
      expect(result).toEqual(token);
    });
  });
});
