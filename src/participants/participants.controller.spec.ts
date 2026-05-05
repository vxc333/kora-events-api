import { Test, TestingModule } from '@nestjs/testing';
import { ParticipantsController } from './participants.controller';
import { ParticipantsService } from './participants.service';
import { Participant, ParticipantStatus } from './participant.entity';

const mockParticipant: Participant = {
  id: 'part-uuid-1',
  eventId: 'evt-uuid-1',
  event: {} as never,
  ticketId: 'tkt-uuid-1',
  ticket: null,
  couponId: null,
  name: 'João da Silva',
  email: 'joao@example.com',
  cpf: null,
  phone: null,
  status: ParticipantStatus.PENDING,
  qrToken: 'mock-qr-token-uuid',
  checkedInAt: null,
  certificateReleased: false,
  registeredAt: new Date(),
  updatedAt: new Date(),
};

describe('ParticipantsController', () => {
  let controller: ParticipantsController;
  let service: jest.Mocked<ParticipantsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ParticipantsController],
      providers: [
        {
          provide: ParticipantsService,
          useValue: {
            register: jest.fn().mockResolvedValue(mockParticipant),
            findAll: jest.fn().mockResolvedValue({ data: [mockParticipant], total: 1, page: 1, limit: 20 }),
            findOne: jest.fn().mockResolvedValue(mockParticipant),
            update: jest.fn().mockResolvedValue({ ...mockParticipant, name: 'Atualizado' }),
            cancel: jest.fn().mockResolvedValue({ ...mockParticipant, status: ParticipantStatus.CANCELLED }),
            importCsv: jest.fn().mockResolvedValue({ imported: 2, failed: [] }),
          },
        },
      ],
    }).compile();

    controller = module.get<ParticipantsController>(ParticipantsController);
    service = module.get(ParticipantsService);
  });

  it('register delegates to service', async () => {
    const dto = { name: 'João', email: 'joao@example.com' };
    const result = await controller.register('evt-uuid-1', dto);
    expect(service.register).toHaveBeenCalledWith('evt-uuid-1', dto);
    expect(result).toEqual(mockParticipant);
  });

  it('findAll delegates to service with query', async () => {
    const query = { page: 1, limit: 20 };
    const result = await controller.findAll('evt-uuid-1', query);
    expect(service.findAll).toHaveBeenCalledWith('evt-uuid-1', query);
    expect(result.total).toBe(1);
  });

  it('update delegates to service', async () => {
    const dto = { name: 'Atualizado' };
    const result = await controller.update('evt-uuid-1', 'part-uuid-1', dto);
    expect(service.update).toHaveBeenCalledWith('evt-uuid-1', 'part-uuid-1', dto);
    expect(result.name).toBe('Atualizado');
  });

  it('cancel delegates to service', async () => {
    const result = await controller.cancel('evt-uuid-1', 'part-uuid-1');
    expect(service.cancel).toHaveBeenCalledWith('evt-uuid-1', 'part-uuid-1');
    expect(result.status).toBe(ParticipantStatus.CANCELLED);
  });
});
