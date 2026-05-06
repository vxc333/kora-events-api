import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import { Participant } from '../participants/participant.entity';
import { Event } from '../events/event.entity';
import { Ticket } from '../tickets/ticket.entity';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get<string>('SMTP_HOST'),
      port: config.get<number>('SMTP_PORT'),
      auth: {
        user: config.get<string>('SMTP_USER'),
        pass: config.get<string>('SMTP_PASS'),
      },
    });
  }

  private loadTemplate(name: string): string {
    return fs.readFileSync(path.join(__dirname, 'templates', name), 'utf8');
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  async sendPasswordReset(email: string, name: string, token: string): Promise<void> {
    const resetUrl = `${this.config.get('FRONTEND_URL')}/reset-password?token=${token}`;
    const html = this.loadTemplate('reset-password.html')
      .replace('{{name}}', name)
      .replace('{{resetUrl}}', resetUrl);

    await this.transporter.sendMail({
      from: this.config.get<string>('SMTP_FROM'),
      to: email,
      subject: 'Redefinição de senha — Kora Events',
      html,
    });
  }

  async sendRegistrationConfirmation(
    participant: Participant,
    event: Event,
    ticket: Ticket | null,
  ): Promise<void> {
    const confirmationUrl = `${this.config.get('FRONTEND_URL')}/e/${event.slug}/confirmacao?email=${encodeURIComponent(participant.email)}`;
    const ticketRow = ticket
      ? `<div class="info-row"><span class="info-label">Ingresso:</span> ${ticket.name}</div>`
      : '';

    const html = this.loadTemplate('registration-confirmation.html')
      .replace('{{name}}', participant.name)
      .replace('{{eventTitle}}', event.title)
      .replace('{{eventDate}}', this.formatDate(event.startDate))
      .replace('{{eventTime}}', event.startTime)
      .replace('{{eventLocation}}', event.location ?? 'Online')
      .replace('{{ticketRow}}', ticketRow)
      .replace('{{confirmationUrl}}', confirmationUrl);

    await this.transporter.sendMail({
      from: this.config.get<string>('SMTP_FROM'),
      to: participant.email,
      subject: `Inscrição confirmada — ${event.title}`,
      html,
    });
  }

  async sendEventReminder(
    participant: Participant,
    event: Event,
    hoursUntil: 24 | 1,
  ): Promise<void> {
    const hoursLabel = hoursUntil === 24 ? '24 horas' : '1 hora';
    const confirmationUrl = `${this.config.get('FRONTEND_URL')}/e/${event.slug}/confirmacao?email=${encodeURIComponent(participant.email)}`;

    const html = this.loadTemplate('event-reminder.html')
      .replace(/{{hoursUntil}}/g, hoursLabel)
      .replace('{{name}}', participant.name)
      .replace('{{eventTitle}}', event.title)
      .replace('{{eventDate}}', this.formatDate(event.startDate))
      .replace('{{eventTime}}', event.startTime)
      .replace('{{eventLocation}}', event.location ?? 'Online')
      .replace('{{confirmationUrl}}', confirmationUrl);

    await this.transporter.sendMail({
      from: this.config.get<string>('SMTP_FROM'),
      to: participant.email,
      subject: `Lembrete — ${event.title} começa em ${hoursLabel}`,
      html,
    });
  }

  async sendCertificateReleased(participant: Participant, event: Event): Promise<void> {
    const certificateUrl = `${this.config.get('APP_URL')}/api/v1/certificates/by-token/${participant.qrToken}`;

    const html = this.loadTemplate('certificate-released.html')
      .replace('{{name}}', participant.name)
      .replace('{{eventTitle}}', event.title)
      .replace('{{certificateUrl}}', certificateUrl);

    await this.transporter.sendMail({
      from: this.config.get<string>('SMTP_FROM'),
      to: participant.email,
      subject: `Seu certificado está disponível — ${event.title}`,
      html,
    });
  }

  async sendCancellation(participant: Participant, event: Event): Promise<void> {
    const html = this.loadTemplate('cancellation.html')
      .replace('{{name}}', participant.name)
      .replace('{{eventTitle}}', event.title);

    await this.transporter.sendMail({
      from: this.config.get<string>('SMTP_FROM'),
      to: participant.email,
      subject: `Inscrição cancelada — ${event.title}`,
      html,
    });
  }
}
