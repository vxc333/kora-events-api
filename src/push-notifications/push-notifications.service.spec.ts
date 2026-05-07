import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { PushNotificationsService } from './push-notifications.service';
import { PushToken } from './push-token.entity';
import { Participant } from '../participants/participant.entity';

jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockPushToken = (overrides: Partial<PushToken> = {}): PushToken => ({
  id: 'pt-uuid-1',
  fcmToken: 'fcm-token-abc',
  userId: null,
  qrToken: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('PushNotificationsService', () => {
  let service: PushNotificationsService;
  let tokenRepo: {
    upsert: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
  };
  let participantRepo: {
    find: jest.Mock;
  };

  beforeEach(async () => {
    tokenRepo = {
      upsert: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };
    participantRepo = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushNotificationsService,
        {
          provide: getRepositoryToken(PushToken),
          useValue: tokenRepo,
        },
        {
          provide: getRepositoryToken(Participant),
          useValue: participantRepo,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'FCM_SERVER_KEY') return 'test-fcm-key';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<PushNotificationsService>(PushNotificationsService);
    jest.clearAllMocks();
  });

  describe('registerToken', () => {
    it('should upsert a new token and return the push token', async () => {
      const token = mockPushToken({ fcmToken: 'new-token', qrToken: 'qr-123' });
      tokenRepo.upsert.mockResolvedValue({ identifiers: [{ id: token.id }] });
      tokenRepo.findOne.mockResolvedValue(token);

      const result = await service.registerToken({ fcmToken: 'new-token', qrToken: 'qr-123' });

      expect(tokenRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ fcmToken: 'new-token', qrToken: 'qr-123' }),
        ['fcmToken'],
      );
      expect(result).toEqual(token);
    });

    it('should upsert existing token without duplicating (idempotent)', async () => {
      const token = mockPushToken({ fcmToken: 'existing-token', userId: 'user-abc' });
      tokenRepo.upsert.mockResolvedValue({ identifiers: [{ id: token.id }] });
      tokenRepo.findOne.mockResolvedValue(token);

      await service.registerToken({ fcmToken: 'existing-token' }, 'user-abc');

      expect(tokenRepo.upsert).toHaveBeenCalledTimes(1);
      expect(tokenRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ fcmToken: 'existing-token', userId: 'user-abc' }),
        ['fcmToken'],
      );
    });
  });

  describe('sendToToken', () => {
    it('should call axios.post with FCM URL and correct Authorization header', async () => {
      mockedAxios.post = jest.fn().mockResolvedValue({ data: { success: 1 } });

      await service.sendToToken(
        'fcm-device-token',
        { title: 'Hello', body: 'World' },
        { type: 'TEST' },
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://fcm.googleapis.com/fcm/send',
        {
          to: 'fcm-device-token',
          notification: { title: 'Hello', body: 'World' },
          data: { type: 'TEST' },
        },
        {
          headers: {
            Authorization: 'key=test-fcm-key',
            'Content-Type': 'application/json',
          },
        },
      );
    });

    it('should silently swallow errors when axios throws', async () => {
      mockedAxios.post = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        service.sendToToken('bad-token', { title: 'Hi', body: 'There' }),
      ).resolves.not.toThrow();
    });
  });

  describe('sendToParticipant', () => {
    it('should return without calling axios when no token found for qrToken', async () => {
      mockedAxios.post = jest.fn();
      tokenRepo.find.mockResolvedValue([]);

      await service.sendToParticipant('unknown-qr', { title: 'Hi', body: 'There' });

      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should call sendToToken for each found token', async () => {
      const token1 = mockPushToken({ fcmToken: 'fcm-1', qrToken: 'qr-abc' });
      const token2 = mockPushToken({ id: 'pt-2', fcmToken: 'fcm-2', qrToken: 'qr-abc' });
      tokenRepo.find.mockResolvedValue([token1, token2]);
      mockedAxios.post = jest.fn().mockResolvedValue({ data: {} });

      await service.sendToParticipant('qr-abc', { title: 'Test', body: 'Msg' });

      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://fcm.googleapis.com/fcm/send',
        expect.objectContaining({ to: 'fcm-1' }),
        expect.any(Object),
      );
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://fcm.googleapis.com/fcm/send',
        expect.objectContaining({ to: 'fcm-2' }),
        expect.any(Object),
      );
    });
  });

  describe('notifyParticipantApproved', () => {
    it('should call sendToParticipant with approval title and body', async () => {
      const spy = jest
        .spyOn(service, 'sendToParticipant')
        .mockResolvedValue(undefined);

      await service.notifyParticipantApproved('qr-token-xyz', 'Evento Teste');

      expect(spy).toHaveBeenCalledWith(
        'qr-token-xyz',
        {
          title: 'Inscrição aprovada! ✅',
          body: 'Sua inscrição em "Evento Teste" foi aprovada.',
        },
        { type: 'APPROVAL' },
      );
    });
  });

  describe('notifyParticipantCertificateAvailable', () => {
    it('should call sendToParticipant with certificate title and body', async () => {
      const spy = jest
        .spyOn(service, 'sendToParticipant')
        .mockResolvedValue(undefined);

      await service.notifyParticipantCertificateAvailable('qr-token-xyz', 'Evento Teste');

      expect(spy).toHaveBeenCalledWith(
        'qr-token-xyz',
        {
          title: 'Certificado disponível 🎓',
          body: 'Seu certificado de "Evento Teste" está disponível para download.',
        },
        { type: 'CERTIFICATE' },
      );
    });
  });
});
