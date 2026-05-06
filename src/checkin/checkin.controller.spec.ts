import { Test, TestingModule } from '@nestjs/testing';
import { CheckinController } from './checkin.controller';
import { CheckinService } from './checkin.service';
import { Participant, ParticipantStatus } from '../participants/participant.entity';
import { Event } from '../events/event.entity';
import { User } from '../users/user.entity';

const mockResult: Participant = {
  id: 'part-uuid-1',
  eventId: 'evt-uuid-1',
  event: {} as Event,
  ticketId: null,
  ticket: null,
  couponId: null,
  name: 'João Silva',
  email: 'joao@example.com',
  cpf: null,
  phone: null,
  status: ParticipantStatus.CONFIRMED,
  qrToken: 'abc-token-123',
  checkedInAt: new Date(),
  certificateReleased: false,
  reminderSent24h: false,
  reminderSent1h: false,
  registeredAt: new Date(),
  updatedAt: new Date(),
};

describe('CheckinController', () => {
  let controller: CheckinController;
  let service: jest.Mocked<CheckinService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CheckinController],
      providers: [
        {
          provide: CheckinService,
          useValue: { checkin: jest.fn(), getStats: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<CheckinController>(CheckinController);
    service = module.get(CheckinService);
  });

  it('should delegate checkin to service with token', async () => {
    service.checkin.mockResolvedValue(mockResult);
    await controller.checkin('abc-token-123');
    expect(service.checkin).toHaveBeenCalledWith('abc-token-123');
  });

  it('should delegate getStats to service with eventId and userId', async () => {
    service.getStats.mockResolvedValue({ total: 10, checkedIn: 5, pending: 5 });
    const user = { id: 'usr-uuid-1' } as User;
    const result = await controller.getStats('evt-uuid-1', user);
    expect(service.getStats).toHaveBeenCalledWith('evt-uuid-1', 'usr-uuid-1');
    expect(result).toEqual({ total: 10, checkedIn: 5, pending: 5 });
  });
});
