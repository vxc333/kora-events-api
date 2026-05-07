import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { PaymentsService } from './payments.service';
import { Payment, PaymentMethod, PaymentStatus } from './payment.entity';
import { Participant, ParticipantStatus } from '../participants/participant.entity';
import { Ticket, TicketType } from '../tickets/ticket.entity';

jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockParticipant: Participant = {
  id: 'part-uuid-1',
  eventId: 'evt-uuid-1',
  event: {} as never,
  ticketId: 'tkt-uuid-1',
  ticket: null,
  couponId: null,
  name: 'João da Silva',
  email: 'joao@example.com',
  cpf: '529.982.247-25',
  phone: null,
  status: ParticipantStatus.PENDING,
  qrToken: 'mock-qr-token-uuid',
  checkedInAt: null,
  certificateReleased: false,
  reminderSent24h: false,
  reminderSent1h: false,
  registeredAt: new Date(),
  updatedAt: new Date(),
};

const mockTicket: Ticket = {
  id: 'tkt-uuid-1',
  name: 'Ingresso Padrão',
  description: null,
  price: 100,
  currency: 'BRL',
  quantity: 10,
  quantitySold: 5,
  isActive: true,
  salesStartDate: null,
  salesEndDate: null,
  isHalfPrice: false,
  feePassthrough: false,
  ticketType: TicketType.STANDARD,
  waitlistEnabled: false,
  waitlistHoldsSpot: false,
  discountCode: null,
  discountPercentage: null,
  eventId: 'evt-uuid-1',
  event: {} as never,
  createdAt: new Date(),
  updatedAt: new Date(),
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
  pixQrCode: 'qr-code-string',
  pixQrCodeUrl: 'https://qr.url',
  pixExpiresAt: new Date(),
  boletoUrl: null,
  boletoBarcode: null,
  boletoExpiresAt: null,
  participant: mockParticipant,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const WEBHOOK_SECRET = 'test-webhook-secret';
const API_KEY = 'test-api-key';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let participantRepo: { findOne: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    paymentRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    participantRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(Payment), useValue: paymentRepo },
        { provide: getRepositoryToken(Participant), useValue: participantRepo },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'PAGARME_API_KEY') return API_KEY;
              if (key === 'PAGARME_WEBHOOK_SECRET') return WEBHOOK_SECRET;
              return null;
            },
          },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    jest.clearAllMocks();
  });

  describe('createPixPayment', () => {
    it('should call Pagar.me API with correct URL and auth, and return Payment with PIX fields', async () => {
      const pagarmeResponse = {
        data: {
          id: 'or_pix_123',
          charges: [
            {
              id: 'ch_pix_123',
              last_transaction: {
                qr_code: 'pix-qr-code-data',
                qr_code_url: 'https://pix.qr/url',
              },
            },
          ],
        },
      };
      mockedAxios.post.mockResolvedValueOnce(pagarmeResponse);

      const createdPayment = { ...mockPayment, method: PaymentMethod.PIX };
      paymentRepo.create.mockReturnValue(createdPayment);
      paymentRepo.save.mockResolvedValue(createdPayment);

      const result = await service.createPixPayment(mockParticipant, mockTicket);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.pagar.me/core/v5/orders',
        expect.objectContaining({
          payments: expect.arrayContaining([
            expect.objectContaining({ payment_method: 'pix' }),
          ]),
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic '),
          }),
        }),
      );

      expect(paymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          method: PaymentMethod.PIX,
          pixQrCode: 'pix-qr-code-data',
          pixQrCodeUrl: 'https://pix.qr/url',
          pagarmeOrderId: 'or_pix_123',
          pagarmeChargeId: 'ch_pix_123',
        }),
      );

      expect(result).toEqual(createdPayment);
    });
  });

  describe('createBoletoPayment', () => {
    it('should call Pagar.me API and return Payment with boleto fields', async () => {
      const pagarmeResponse = {
        data: {
          id: 'or_boleto_123',
          charges: [
            {
              id: 'ch_boleto_123',
              last_transaction: {
                pdf: 'https://boleto.pdf/url',
                line: '12345.67890 12345.678901 12345.678901 1 12340000010000',
              },
            },
          ],
        },
      };
      mockedAxios.post.mockResolvedValueOnce(pagarmeResponse);

      const createdPayment = {
        ...mockPayment,
        method: PaymentMethod.BOLETO,
        boletoUrl: 'https://boleto.pdf/url',
        boletoBarcode: '12345.67890 12345.678901 12345.678901 1 12340000010000',
        pixQrCode: null,
        pixQrCodeUrl: null,
      };
      paymentRepo.create.mockReturnValue(createdPayment);
      paymentRepo.save.mockResolvedValue(createdPayment);

      const result = await service.createBoletoPayment(mockParticipant, mockTicket);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.pagar.me/core/v5/orders',
        expect.objectContaining({
          payments: expect.arrayContaining([
            expect.objectContaining({ payment_method: 'boleto' }),
          ]),
        }),
        expect.anything(),
      );

      expect(paymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          method: PaymentMethod.BOLETO,
          boletoUrl: 'https://boleto.pdf/url',
          boletoBarcode: '12345.67890 12345.678901 12345.678901 1 12340000010000',
          pagarmeOrderId: 'or_boleto_123',
          pagarmeChargeId: 'ch_boleto_123',
        }),
      );

      expect(result).toEqual(createdPayment);
    });
  });

  describe('createCardPayment', () => {
    it('should set Payment and Participant status to CONFIRMED when charge is paid', async () => {
      const pagarmeResponse = {
        data: {
          id: 'or_card_123',
          charges: [
            {
              id: 'ch_card_123',
              status: 'paid',
              last_transaction: {},
            },
          ],
        },
      };
      mockedAxios.post.mockResolvedValueOnce(pagarmeResponse);

      // create() passes through the argument (like real TypeORM)
      paymentRepo.create.mockImplementation((dto: Partial<Payment>) => dto as Payment);
      paymentRepo.save.mockImplementation((entity: Payment) => Promise.resolve(entity));

      const participantToUpdate = { ...mockParticipant, status: ParticipantStatus.PENDING };
      participantRepo.findOne.mockResolvedValue(participantToUpdate);
      participantRepo.save.mockResolvedValue({ ...participantToUpdate, status: ParticipantStatus.CONFIRMED });

      const result = await service.createCardPayment(mockParticipant, mockTicket, 'card_token_123');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.pagar.me/core/v5/orders',
        expect.objectContaining({
          payments: expect.arrayContaining([
            expect.objectContaining({
              payment_method: 'credit_card',
              credit_card: expect.objectContaining({ card_token: 'card_token_123' }),
            }),
          ]),
        }),
        expect.anything(),
      );

      expect(paymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentStatus.CONFIRMED }),
      );
      expect(participantRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ParticipantStatus.CONFIRMED }),
      );
      expect(result.status).toBe(PaymentStatus.CONFIRMED);
    });
  });

  describe('handleWebhook', () => {
    it('should throw ForbiddenException when signature is invalid', async () => {
      const body = JSON.stringify({ type: 'charge.paid', data: { charges: [{ id: 'ch_xxx', status: 'paid' }] } });
      const invalidSignature = 'invalid-hmac-signature';

      await expect(service.handleWebhook(body, invalidSignature)).rejects.toThrow(ForbiddenException);
    });

    it('should update Payment and Participant to CONFIRMED when signature is valid and charge is paid', async () => {
      const bodyObj = {
        type: 'charge.paid',
        data: { charges: [{ id: 'ch_xxx', status: 'paid' }] },
      };
      const body = JSON.stringify(bodyObj);
      const validSignature = createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');

      const paymentToUpdate = { ...mockPayment, status: PaymentStatus.PENDING };
      paymentRepo.findOne.mockResolvedValue(paymentToUpdate);
      paymentRepo.save.mockResolvedValue({ ...paymentToUpdate, status: PaymentStatus.CONFIRMED });

      const participantToUpdate = { ...mockParticipant, status: ParticipantStatus.PENDING };
      participantRepo.findOne.mockResolvedValue(participantToUpdate);
      participantRepo.save.mockResolvedValue({ ...participantToUpdate, status: ParticipantStatus.CONFIRMED });

      await service.handleWebhook(body, validSignature);

      expect(paymentRepo.findOne).toHaveBeenCalledWith({ where: { pagarmeChargeId: 'ch_xxx' } });
      expect(paymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentStatus.CONFIRMED }),
      );
      expect(participantRepo.findOne).toHaveBeenCalledWith({ where: { id: 'part-uuid-1' } });
      expect(participantRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ParticipantStatus.CONFIRMED }),
      );
    });
  });

  describe('refundPayment', () => {
    it('should throw NotFoundException when payment is not found', async () => {
      paymentRepo.findOne.mockResolvedValue(null);
      await expect(service.refundPayment('pay-uuid-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when payment status is PENDING', async () => {
      paymentRepo.findOne.mockResolvedValue({ ...mockPayment, status: PaymentStatus.PENDING });
      await expect(service.refundPayment('pay-uuid-1')).rejects.toThrow(BadRequestException);
    });

    it('should call Pagar.me cancel endpoint and update Payment to REFUNDED and Participant to CANCELLED', async () => {
      const confirmedPayment = { ...mockPayment, status: PaymentStatus.CONFIRMED };
      paymentRepo.findOne.mockResolvedValue(confirmedPayment);
      paymentRepo.save.mockResolvedValue({ ...confirmedPayment, status: PaymentStatus.REFUNDED });

      mockedAxios.post.mockResolvedValueOnce({ data: { status: 'canceled' } });

      const participantToUpdate = { ...mockParticipant, status: ParticipantStatus.CONFIRMED };
      participantRepo.findOne.mockResolvedValue(participantToUpdate);
      participantRepo.save.mockResolvedValue({ ...participantToUpdate, status: ParticipantStatus.CANCELLED });

      const result = await service.refundPayment('pay-uuid-1');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `https://api.pagar.me/core/v5/charges/${confirmedPayment.pagarmeChargeId}/cancel`,
        {},
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic '),
          }),
        }),
      );

      expect(paymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentStatus.REFUNDED }),
      );
      expect(participantRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ParticipantStatus.CANCELLED }),
      );
      expect(result.status).toBe(PaymentStatus.REFUNDED);
    });
  });
});
