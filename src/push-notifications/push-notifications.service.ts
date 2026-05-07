import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PushToken } from './push-token.entity';
import { Participant } from '../participants/participant.entity';
import { RegisterTokenDto } from './dto/register-token.dto';

const FCM_URL = 'https://fcm.googleapis.com/fcm/send';

@Injectable()
export class PushNotificationsService {
  constructor(
    @InjectRepository(PushToken)
    private readonly tokenRepo: Repository<PushToken>,
    @InjectRepository(Participant)
    private readonly participantRepo: Repository<Participant>,
    private readonly config: ConfigService,
  ) {}

  async registerToken(
    dto: RegisterTokenDto,
    userId?: string,
  ): Promise<PushToken> {
    const resolvedUserId = dto.userId ?? userId ?? null;
    await this.tokenRepo.upsert(
      {
        fcmToken: dto.fcmToken,
        userId: resolvedUserId,
        qrToken: dto.qrToken ?? null,
      },
      ['fcmToken'],
    );
    return this.tokenRepo.findOne({ where: { fcmToken: dto.fcmToken } }) as Promise<PushToken>;
  }

  async sendToToken(
    fcmToken: string,
    notification: { title: string; body: string },
    data?: Record<string, string>,
  ): Promise<void> {
    try {
      await axios.post(
        FCM_URL,
        {
          to: fcmToken,
          notification,
          data: data ?? {},
        },
        {
          headers: {
            Authorization: `key=${this.config.get<string>('FCM_SERVER_KEY')}`,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch {
      // Push failures are best-effort — silently swallow errors
    }
  }

  async sendToParticipant(
    qrToken: string,
    notification: { title: string; body: string },
    data?: Record<string, string>,
  ): Promise<void> {
    const tokens = await this.tokenRepo.find({ where: { qrToken } });
    if (!tokens.length) return;
    await Promise.all(
      tokens.map((t) => this.sendToToken(t.fcmToken, notification, data)),
    );
  }

  async sendToUser(
    userId: string,
    notification: { title: string; body: string },
    data?: Record<string, string>,
  ): Promise<void> {
    const tokens = await this.tokenRepo.find({ where: { userId } });
    if (!tokens.length) return;
    await Promise.all(
      tokens.map((t) => this.sendToToken(t.fcmToken, notification, data)),
    );
  }

  async notifyParticipantApproved(
    participantQrToken: string,
    eventTitle: string,
  ): Promise<void> {
    await this.sendToParticipant(
      participantQrToken,
      {
        title: 'Inscrição aprovada! ✅',
        body: `Sua inscrição em "${eventTitle}" foi aprovada.`,
      },
      { type: 'APPROVAL' },
    );
  }

  async notifyParticipantCertificateAvailable(
    participantQrToken: string,
    eventTitle: string,
  ): Promise<void> {
    await this.sendToParticipant(
      participantQrToken,
      {
        title: 'Certificado disponível 🎓',
        body: `Seu certificado de "${eventTitle}" está disponível para download.`,
      },
      { type: 'CERTIFICATE' },
    );
  }

  async notifyEventReminder(eventId: string, eventTitle: string): Promise<void> {
    const participants = await this.participantRepo.find({
      where: { eventId },
    });
    if (!participants.length) return;

    const qrTokens = participants
      .map((p) => p.qrToken)
      .filter((q): q is string => !!q);

    const notification = {
      title: `Lembrete: ${eventTitle}`,
      body: `O evento "${eventTitle}" está chegando! Não esqueça de participar.`,
    };

    await Promise.all(
      qrTokens.map((qrToken) =>
        this.sendToParticipant(qrToken, notification, { type: 'REMINDER', eventId }),
      ),
    );
  }
}
