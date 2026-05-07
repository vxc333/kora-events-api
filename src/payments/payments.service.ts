import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import axios from 'axios';
import { Payment, PaymentMethod, PaymentStatus } from './payment.entity';
import { Participant, ParticipantStatus } from '../participants/participant.entity';
import { Ticket } from '../tickets/ticket.entity';

@Injectable()
export class PaymentsService {
  private readonly baseUrl = 'https://api.pagar.me/core/v5';

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Participant)
    private readonly participantRepository: Repository<Participant>,
    private readonly configService: ConfigService,
  ) {}

  private getAuthHeader(): string {
    const apiKey = this.configService.get<string>('PAGARME_API_KEY');
    const encoded = Buffer.from(`${apiKey}:`).toString('base64');
    return `Basic ${encoded}`;
  }

  private buildCustomer(participant: Participant) {
    return {
      name: participant.name,
      email: participant.email,
      document: participant.cpf ?? undefined,
      document_type: participant.cpf ? 'CPF' : undefined,
    };
  }

  private buildItems(ticket: Ticket) {
    return [
      {
        amount: Math.round(Number(ticket.price) * 100),
        description: ticket.name,
        quantity: 1,
        code: ticket.id,
      },
    ];
  }

  async createPixPayment(participant: Participant, ticket: Ticket): Promise<Payment> {
    const amount = Math.round(Number(ticket.price) * 100);

    const response = await axios.post(
      `${this.baseUrl}/orders`,
      {
        customer: this.buildCustomer(participant),
        items: this.buildItems(ticket),
        payments: [
          {
            payment_method: 'pix',
            pix: {
              expires_in: 3600,
            },
            amount,
          },
        ],
      },
      {
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      },
    );

    const order = response.data;
    const charge = order.charges[0];
    const lastTransaction = charge.last_transaction;

    const pixExpiresAt = new Date();
    pixExpiresAt.setSeconds(pixExpiresAt.getSeconds() + 3600);

    const payment = this.paymentRepository.create({
      participantId: participant.id,
      eventId: participant.eventId,
      ticketId: ticket.id,
      amount,
      method: PaymentMethod.PIX,
      status: PaymentStatus.PENDING,
      pagarmeOrderId: order.id,
      pagarmeChargeId: charge.id,
      pixQrCode: lastTransaction.qr_code,
      pixQrCodeUrl: lastTransaction.qr_code_url,
      pixExpiresAt,
      boletoUrl: null,
      boletoBarcode: null,
      boletoExpiresAt: null,
    });

    return this.paymentRepository.save(payment);
  }

  async createBoletoPayment(participant: Participant, ticket: Ticket): Promise<Payment> {
    const amount = Math.round(Number(ticket.price) * 100);

    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + 3);

    const response = await axios.post(
      `${this.baseUrl}/orders`,
      {
        customer: this.buildCustomer(participant),
        items: this.buildItems(ticket),
        payments: [
          {
            payment_method: 'boleto',
            boleto: {
              due_at: dueAt.toISOString(),
            },
            amount,
          },
        ],
      },
      {
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      },
    );

    const order = response.data;
    const charge = order.charges[0];
    const lastTransaction = charge.last_transaction;

    const payment = this.paymentRepository.create({
      participantId: participant.id,
      eventId: participant.eventId,
      ticketId: ticket.id,
      amount,
      method: PaymentMethod.BOLETO,
      status: PaymentStatus.PENDING,
      pagarmeOrderId: order.id,
      pagarmeChargeId: charge.id,
      pixQrCode: null,
      pixQrCodeUrl: null,
      pixExpiresAt: null,
      boletoUrl: lastTransaction.pdf,
      boletoBarcode: lastTransaction.line,
      boletoExpiresAt: dueAt,
    });

    return this.paymentRepository.save(payment);
  }

  async createCardPayment(
    participant: Participant,
    ticket: Ticket,
    cardToken: string,
  ): Promise<Payment> {
    const amount = Math.round(Number(ticket.price) * 100);

    const response = await axios.post(
      `${this.baseUrl}/orders`,
      {
        customer: this.buildCustomer(participant),
        items: this.buildItems(ticket),
        payments: [
          {
            payment_method: 'credit_card',
            credit_card: {
              card_token: cardToken,
              installments: 1,
            },
            amount,
          },
        ],
      },
      {
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      },
    );

    const order = response.data;
    const charge = order.charges[0];
    const isPaid = charge.status === 'paid';

    const payment = this.paymentRepository.create({
      participantId: participant.id,
      eventId: participant.eventId,
      ticketId: ticket.id,
      amount,
      method: PaymentMethod.CREDIT_CARD,
      status: isPaid ? PaymentStatus.CONFIRMED : PaymentStatus.PENDING,
      pagarmeOrderId: order.id,
      pagarmeChargeId: charge.id,
      pixQrCode: null,
      pixQrCodeUrl: null,
      pixExpiresAt: null,
      boletoUrl: null,
      boletoBarcode: null,
      boletoExpiresAt: null,
    });

    const savedPayment = await this.paymentRepository.save(payment);

    if (isPaid) {
      const participantToUpdate = await this.participantRepository.findOne({
        where: { id: participant.id },
      });
      if (participantToUpdate) {
        participantToUpdate.status = ParticipantStatus.CONFIRMED;
        await this.participantRepository.save(participantToUpdate);
      }
    }

    return savedPayment;
  }

  async handleWebhook(body: string, signature: string): Promise<void> {
    const secret = this.configService.get<string>('PAGARME_WEBHOOK_SECRET');
    const expectedSignature = createHmac('sha256', secret!)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new ForbiddenException('Invalid webhook signature');
    }

    const payload = JSON.parse(body);
    const charges = payload?.data?.charges ?? [];

    if (charges.length === 0) return;

    const charge = charges[0];
    if (charge.status !== 'paid') return;

    const payment = await this.paymentRepository.findOne({
      where: { pagarmeChargeId: charge.id },
    });

    if (!payment) return;

    payment.status = PaymentStatus.CONFIRMED;
    await this.paymentRepository.save(payment);

    const participant = await this.participantRepository.findOne({
      where: { id: payment.participantId },
    });

    if (participant) {
      participant.status = ParticipantStatus.CONFIRMED;
      await this.participantRepository.save(participant);
    }
  }

  async getPaymentStatus(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    return payment;
  }

  async refundPayment(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    if (payment.status !== PaymentStatus.CONFIRMED) {
      throw new BadRequestException(
        `Cannot refund a payment with status ${payment.status}`,
      );
    }

    await axios.post(
      `${this.baseUrl}/charges/${payment.pagarmeChargeId}/cancel`,
      {},
      {
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      },
    );

    payment.status = PaymentStatus.REFUNDED;
    const updatedPayment = await this.paymentRepository.save(payment);

    const participant = await this.participantRepository.findOne({
      where: { id: payment.participantId },
    });

    if (participant) {
      participant.status = ParticipantStatus.CANCELLED;
      await this.participantRepository.save(participant);
    }

    return updatedPayment;
  }
}
