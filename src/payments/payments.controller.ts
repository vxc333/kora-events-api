import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { Payment } from './payment.entity';
import { Participant } from '../participants/participant.entity';
import { Ticket } from '../tickets/ticket.entity';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    @InjectRepository(Participant)
    private readonly participantRepository: Repository<Participant>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('checkout/pix')
  async checkoutPix(@Body() body: { participantId: string }): Promise<Payment> {
    const participant = await this.participantRepository.findOne({
      where: { id: body.participantId },
    });
    if (!participant) {
      throw new NotFoundException(`Participant ${body.participantId} not found`);
    }

    const ticket = await this.ticketRepository.findOne({
      where: { id: participant.ticketId! },
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket not found for participant`);
    }

    return this.paymentsService.createPixPayment(participant, ticket);
  }

  @UseGuards(JwtAuthGuard)
  @Post('checkout/boleto')
  async checkoutBoleto(@Body() body: { participantId: string }): Promise<Payment> {
    const participant = await this.participantRepository.findOne({
      where: { id: body.participantId },
    });
    if (!participant) {
      throw new NotFoundException(`Participant ${body.participantId} not found`);
    }

    const ticket = await this.ticketRepository.findOne({
      where: { id: participant.ticketId! },
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket not found for participant`);
    }

    return this.paymentsService.createBoletoPayment(participant, ticket);
  }

  @UseGuards(JwtAuthGuard)
  @Post('checkout/card')
  async checkoutCard(
    @Body() body: { participantId: string; cardToken: string },
  ): Promise<Payment> {
    const participant = await this.participantRepository.findOne({
      where: { id: body.participantId },
    });
    if (!participant) {
      throw new NotFoundException(`Participant ${body.participantId} not found`);
    }

    const ticket = await this.ticketRepository.findOne({
      where: { id: participant.ticketId! },
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket not found for participant`);
    }

    return this.paymentsService.createCardPayment(participant, ticket, body.cardToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/status')
  async getStatus(@Param('id', ParseUUIDPipe) id: string): Promise<Payment> {
    return this.paymentsService.getPaymentStatus(id);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Req() req: Request,
    @Headers('x-pagarme-signature') signature: string,
  ): Promise<void> {
    const body = JSON.stringify(req.body);
    return this.paymentsService.handleWebhook(body, signature);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/refund')
  async refund(@Param('id', ParseUUIDPipe) id: string): Promise<Payment> {
    return this.paymentsService.refundPayment(id);
  }
}
