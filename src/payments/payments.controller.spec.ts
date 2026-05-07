import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment, PaymentMethod, PaymentStatus } from './payment.entity';
import { ParticipantStatus } from '../participants/participant.entity';

const mockParticipant = {
  id: 'part-uuid-1',
  eventId: 'evt-uuid-1',
  ticketId: 'tkt-uuid-1',
  name: 'João da Silva',
  email: 'joao@example.com',
  cpf: '529.982.247-25',
  phone: null,
  status: ParticipantStatus.PENDING,
};

const mockTicket = {
  id: 'tkt-uuid-1',
  name: 'Ingresso Padrão',
  price: 100,
  eventId: 'evt-uuid-1',
};

const mockPayment: Payment = {
  id: 'pay-uuid-1',
  participantId: 'part-uuid-1',
  eventId: 'evt-uuid-1',
  ticketId: 'tkt-uuid-1',
  amount: 10000,
  method: PaymentMethod.PIX,
  status: PaymentStatus.PENDING,
  pagarmeOrderId: 'or_xxx',
  pagarmeChargeId: 'ch_xxx',
  pixQrCode: 'qr-code-data',
  pixQrCodeUrl: 'https://qr.url',
  pixExpiresAt: new Date(),
  boletoUrl: null,
  boletoBarcode: null,
  boletoExpiresAt: null,
  participant: mockParticipant as never,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: jest.Mocked<PaymentsService>;
  let participantRepo: { findOne: jest.Mock };
  let ticketRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    participantRepo = { findOne: jest.fn().mockResolvedValue(mockParticipant) };
    ticketRepo = { findOne: jest.fn().mockResolvedValue(mockTicket) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: {
            createPixPayment: jest.fn().mockResolvedValue(mockPayment),
            createBoletoPayment: jest.fn().mockResolvedValue({ ...mockPayment, method: PaymentMethod.BOLETO }),
            createCardPayment: jest.fn().mockResolvedValue({ ...mockPayment, method: PaymentMethod.CREDIT_CARD, status: PaymentStatus.CONFIRMED }),
            getPaymentStatus: jest.fn().mockResolvedValue(mockPayment),
            handleWebhook: jest.fn().mockResolvedValue(undefined),
            refundPayment: jest.fn().mockResolvedValue({ ...mockPayment, status: PaymentStatus.REFUNDED }),
          },
        },
        { provide: 'ParticipantRepository', useValue: participantRepo },
        { provide: 'TicketRepository', useValue: ticketRepo },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    service = module.get(PaymentsService);
  });

  describe('POST /payments/checkout/pix', () => {
    it('should load participant and ticket then call service.createPixPayment', async () => {
      const body = { participantId: 'part-uuid-1' };
      const result = await controller.checkoutPix(body);

      expect(participantRepo.findOne).toHaveBeenCalledWith({ where: { id: 'part-uuid-1' } });
      expect(ticketRepo.findOne).toHaveBeenCalledWith({ where: { id: 'tkt-uuid-1' } });
      expect(service.createPixPayment).toHaveBeenCalledWith(mockParticipant, mockTicket);
      expect(result).toEqual(mockPayment);
    });
  });

  describe('POST /payments/webhook', () => {
    it('should call service.handleWebhook with JSON body string and signature header', async () => {
      const reqBody = { type: 'charge.paid', data: { charges: [{ id: 'ch_xxx', status: 'paid' }] } };
      const mockReq = { body: reqBody } as unknown as import('express').Request;
      const signature = 'test-signature';

      await controller.webhook(mockReq, signature);

      expect(service.handleWebhook).toHaveBeenCalledWith(
        JSON.stringify(reqBody),
        signature,
      );
    });
  });

  describe('POST /payments/:id/refund', () => {
    it('should call service.refundPayment with the payment id', async () => {
      const result = await controller.refund('pay-uuid-1');

      expect(service.refundPayment).toHaveBeenCalledWith('pay-uuid-1');
      expect(result.status).toBe(PaymentStatus.REFUNDED);
    });
  });
});
