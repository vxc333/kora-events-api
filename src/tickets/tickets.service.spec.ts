import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, HttpException, NotFoundException } from '@nestjs/common';
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

describe('TicketsService', () => {
  let service: TicketsService;
  let repo: jest.Mocked<Repository<Ticket>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        {
          provide: getRepositoryToken(Ticket),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    repo = module.get(getRepositoryToken(Ticket));
  });

  describe('create', () => {
    it('should throw 501 when price > 0 (paid ticket)', async () => {
      await expect(
        service.create('evt-uuid-1', { name: 'VIP', price: 99.9 }),
      ).rejects.toThrow(HttpException);

      try {
        await service.create('evt-uuid-1', { name: 'VIP', price: 99.9 });
      } catch (e: unknown) {
        expect((e as HttpException).getStatus()).toBe(501);
        expect((e as HttpException).message).toContain('Pagamentos serão implementados em breve');
      }
    });

    it('should create a free ticket successfully', async () => {
      repo.create.mockReturnValue({ ...mockTicket });
      repo.save.mockResolvedValue({ ...mockTicket });
      const result = await service.create('evt-uuid-1', { name: 'Ingresso Padrão', price: 0 });
      expect(repo.save).toHaveBeenCalled();
      expect(result.price).toBe(0);
    });
  });

  describe('findByEvent', () => {
    it('should return all tickets for the event', async () => {
      repo.find.mockResolvedValue([mockTicket]);
      const result = await service.findByEvent('evt-uuid-1');
      expect(result).toEqual([mockTicket]);
    });
  });

  describe('findAvailable', () => {
    it('should return active tickets within sales window', async () => {
      repo.find.mockResolvedValue([mockTicket]);
      const result = await service.findAvailable('evt-uuid-1');
      expect(result).toBeDefined();
    });

    it('should mark ticket as sold out when quantitySold >= quantity', () => {
      const soldOut = { ...mockTicket, quantity: 10, quantitySold: 10 };
      const result = service['isSoldOut'](soldOut);
      expect(result).toBe(true);
    });

    it('should not mark as sold out when quantity is null (unlimited)', () => {
      const unlimited = { ...mockTicket, quantity: null, quantitySold: 9999 };
      const result = service['isSoldOut'](unlimited);
      expect(result).toBe(false);
    });

    it('should return effectivePrice equal to price for regular ticket', async () => {
      const regular = { ...mockTicket, price: 100, isHalfPrice: false };
      repo.find.mockResolvedValue([regular]);
      const [result] = await service.findAvailable('evt-uuid-1');
      expect(result.effectivePrice).toBe(100);
    });

    it('should return effectivePrice as half the price for meia-entrada ticket', async () => {
      const halfPrice = { ...mockTicket, price: 100, isHalfPrice: true };
      repo.find.mockResolvedValue([halfPrice]);
      const [result] = await service.findAvailable('evt-uuid-1');
      expect(result.effectivePrice).toBe(50);
    });

    it('should return effectivePrice = 0 for free meia-entrada ticket', async () => {
      const freeHalf = { ...mockTicket, price: 0, isHalfPrice: true };
      repo.find.mockResolvedValue([freeHalf]);
      const [result] = await service.findAvailable('evt-uuid-1');
      expect(result.effectivePrice).toBe(0);
    });
  });

  describe('update', () => {
    it('should update and save ticket', async () => {
      repo.findOne.mockResolvedValue({ ...mockTicket });
      repo.save.mockResolvedValue({ ...mockTicket, name: 'VIP Gratuito' });
      const result = await service.update('evt-uuid-1', 'tkt-uuid-1', { name: 'VIP Gratuito' });
      expect(result.name).toBe('VIP Gratuito');
    });

    it('should throw NotFoundException when ticket does not belong to event', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.update('evt-uuid-1', 'wrong-id', { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove ticket when quantitySold is 0', async () => {
      repo.findOne.mockResolvedValue({ ...mockTicket, quantitySold: 0 });
      repo.remove.mockResolvedValue({ ...mockTicket });
      await service.remove('evt-uuid-1', 'tkt-uuid-1');
      expect(repo.remove).toHaveBeenCalled();
    });

    it('should throw BadRequestException when quantitySold > 0', async () => {
      repo.findOne.mockResolvedValue({ ...mockTicket, quantitySold: 3 });
      await expect(service.remove('evt-uuid-1', 'tkt-uuid-1')).rejects.toThrow(BadRequestException);
    });
  });
});
