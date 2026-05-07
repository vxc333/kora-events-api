import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { TicketTransfer, TicketTransferStatus } from './ticket-transfer.entity';
import { Participant, ParticipantStatus } from '../participants/participant.entity';
import { Event } from '../events/event.entity';
import { MailService } from '../mail/mail.service';
import { InitiateTransferDto } from './dto/initiate-transfer.dto';

@Injectable()
export class TicketTransfersService {
  constructor(
    @InjectRepository(TicketTransfer)
    private readonly transferRepo: Repository<TicketTransfer>,
    @InjectRepository(Participant)
    private readonly participantRepo: Repository<Participant>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    private readonly mailService: MailService,
  ) {}

  async initiate(eventId: string, dto: InitiateTransferDto): Promise<TicketTransfer> {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento não encontrado');

    const from = await this.participantRepo.findOne({ where: { qrToken: dto.qrToken, eventId } });
    if (!from) throw new NotFoundException('Participante não encontrado');
    if (from.status !== ParticipantStatus.CONFIRMED) {
      throw new HttpException(
        { message: 'Apenas participantes confirmados podem transferir ingressos', code: 'PARTICIPANT_NOT_CONFIRMED' },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const existing = await this.transferRepo.findOne({
      where: { fromParticipantId: from.id, status: TicketTransferStatus.PENDING },
    });
    if (existing) throw new ConflictException('Já existe uma transferência pendente para este participante');

    if (from.email.toLowerCase() === dto.toEmail.toLowerCase()) {
      throw new ConflictException('Não é possível transferir para o mesmo email');
    }

    const toExists = await this.participantRepo.findOne({ where: { eventId, email: dto.toEmail } });
    if (toExists) throw new ConflictException('O destinatário já está inscrito neste evento');

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const transfer = await this.transferRepo.save(
      this.transferRepo.create({
        eventId,
        fromParticipantId: from.id,
        toEmail: dto.toEmail,
        toName: dto.toName,
        toCpf: dto.toCpf ?? null,
        toPhone: dto.toPhone ?? null,
        token: randomUUID(),
        expiresAt,
      }),
    );

    const acceptUrl = `${process.env.FRONTEND_URL}/transferencias/${transfer.token}/aceitar`;
    try {
      await this.mailService.sendTransferInvite(dto.toEmail, dto.toName, from.name, event, acceptUrl);
    } catch { /* ignore */ }

    return transfer;
  }

  async accept(token: string): Promise<Participant> {
    const transfer = await this.transferRepo.findOne({
      where: { token },
      relations: ['fromParticipant'],
    });
    if (!transfer) throw new NotFoundException('Token de transferência inválido');
    if (transfer.status !== TicketTransferStatus.PENDING) {
      throw new HttpException(
        { message: 'Esta transferência não está mais pendente', code: 'TRANSFER_NOT_PENDING' },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (new Date() > transfer.expiresAt) {
      await this.transferRepo.update(transfer.id, { status: TicketTransferStatus.EXPIRED });
      throw new HttpException(
        { message: 'Link de transferência expirado', code: 'TRANSFER_EXPIRED' },
        HttpStatus.GONE,
      );
    }

    const from = transfer.fromParticipant;

    const newParticipant = await this.participantRepo.save(
      this.participantRepo.create({
        eventId: transfer.eventId,
        name: transfer.toName,
        email: transfer.toEmail,
        cpf: transfer.toCpf,
        phone: transfer.toPhone,
        ticketId: from.ticketId,
        status: ParticipantStatus.CONFIRMED,
        qrToken: randomUUID(),
      }),
    );

    await this.participantRepo.update(from.id, { status: ParticipantStatus.CANCELLED });
    await this.transferRepo.update(transfer.id, {
      status: TicketTransferStatus.COMPLETED,
      toParticipantId: newParticipant.id,
    });

    try {
      const event = await this.eventRepo.findOne({ where: { id: transfer.eventId } });
      if (event) await this.mailService.sendRegistrationConfirmation(newParticipant, event, null);
    } catch { /* ignore */ }

    return newParticipant;
  }

  async cancel(token: string, qrToken: string): Promise<TicketTransfer> {
    const participant = await this.participantRepo.findOne({ where: { qrToken } });
    if (!participant) throw new NotFoundException('Participante não encontrado');

    const transfer = await this.transferRepo.findOne({
      where: { token, fromParticipantId: participant.id },
    });
    if (!transfer) throw new NotFoundException('Transferência não encontrada');
    if (transfer.status !== TicketTransferStatus.PENDING) {
      throw new HttpException(
        { message: 'Esta transferência não está mais pendente', code: 'TRANSFER_NOT_PENDING' },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    transfer.status = TicketTransferStatus.CANCELLED;
    return this.transferRepo.save(transfer);
  }

  async findByEvent(eventId: string, organizerId: string): Promise<TicketTransfer[]> {
    const event = await this.eventRepo.findOne({ where: { id: eventId, organizerId } });
    if (!event) throw new NotFoundException('Evento não encontrado');
    return this.transferRepo.find({
      where: { eventId },
      order: { createdAt: 'DESC' },
      relations: ['fromParticipant'],
    });
  }
}
