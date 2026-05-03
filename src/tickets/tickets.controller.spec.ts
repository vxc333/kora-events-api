import { Test, TestingModule } from '@nestjs/testing';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { Ticket } from './ticket.entity';

const mockTicket: Ticket = {
  id: 'tkt-uuid-1',
  name: 'Ingresso Padrão',
  description: null,
  price: 0,
  currency: 'BRL',
  quantity: 100,
  quantitySold: 0,
  isActive: true,
  salesStartDate: null,
  salesEndDate: null,
  isHalfPrice: false,
  discountCode: null,
  discountPercentage: null,
  eventId: 'evt-uuid-1',
  event: {} as never,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('TicketsController', () => {
  let controller: TicketsController;
  let service: jest.Mocked<TicketsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [
        {
          provide: TicketsService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockTicket),
            findByEvent: jest.fn().mockResolvedValue([mockTicket]),
            findAvailable: jest.fn().mockResolvedValue([{ ...mockTicket, isSoldOut: false, isOnSale: true, effectivePrice: 0 }]),
            update: jest.fn().mockResolvedValue({ ...mockTicket, name: 'Updated' }),
            remove: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<TicketsController>(TicketsController);
    service = module.get(TicketsService);
  });

  it('create should delegate to service with eventId', async () => {
    const dto = { name: 'Ingresso Padrão', price: 0 };
    const result = await controller.create('evt-uuid-1', dto);
    expect(service.create).toHaveBeenCalledWith('evt-uuid-1', dto);
    expect(result).toEqual(mockTicket);
  });

  it('findByEvent should return ticket list', async () => {
    const result = await controller.findByEvent('evt-uuid-1');
    expect(service.findByEvent).toHaveBeenCalledWith('evt-uuid-1');
    expect(result).toEqual([mockTicket]);
  });

  it('findAvailable should return tickets enriched with availability and effectivePrice', async () => {
    const result = await controller.findAvailable('evt-uuid-1');
    expect(service.findAvailable).toHaveBeenCalledWith('evt-uuid-1');
    expect(result[0]).toHaveProperty('isSoldOut');
    expect(result[0]).toHaveProperty('isOnSale');
    expect(result[0]).toHaveProperty('effectivePrice');
  });

  it('update should call service with eventId and ticketId', async () => {
    const dto = { name: 'Updated' };
    const result = await controller.update('evt-uuid-1', 'tkt-uuid-1', dto);
    expect(service.update).toHaveBeenCalledWith('evt-uuid-1', 'tkt-uuid-1', dto);
    expect(result.name).toBe('Updated');
  });

  it('remove should call service and return 204', async () => {
    await controller.remove('evt-uuid-1', 'tkt-uuid-1');
    expect(service.remove).toHaveBeenCalledWith('evt-uuid-1', 'tkt-uuid-1');
  });
});
