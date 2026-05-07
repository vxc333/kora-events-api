import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHmac, randomBytes } from 'crypto';
import { WebhookEndpoint, WebhookEventType } from './webhook-endpoint.entity';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';

@Injectable()
export class WebhooksService {
  constructor(
    @InjectRepository(WebhookEndpoint)
    private readonly webhookRepo: Repository<WebhookEndpoint>,
  ) {}

  async create(userId: string, dto: CreateWebhookDto): Promise<WebhookEndpoint> {
    const secret = randomBytes(32).toString('hex');
    return this.webhookRepo.save(
      this.webhookRepo.create({ userId, url: dto.url, events: dto.events, secret }),
    );
  }

  async findByUser(userId: string): Promise<WebhookEndpoint[]> {
    return this.webhookRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async update(id: string, userId: string, dto: UpdateWebhookDto): Promise<WebhookEndpoint> {
    const webhook = await this.webhookRepo.findOne({ where: { id, userId } });
    if (!webhook) throw new NotFoundException('Webhook não encontrado');
    Object.assign(webhook, dto);
    return this.webhookRepo.save(webhook);
  }

  async remove(id: string, userId: string): Promise<void> {
    const webhook = await this.webhookRepo.findOne({ where: { id, userId } });
    if (!webhook) throw new NotFoundException('Webhook não encontrado');
    await this.webhookRepo.remove(webhook);
  }

  async dispatch(
    organizerId: string,
    eventType: WebhookEventType,
    payload: object,
  ): Promise<void> {
    const webhooks = await this.webhookRepo.find({
      where: { userId: organizerId, isActive: true },
    });

    const active = webhooks.filter(
      (w) => w.events.includes(eventType) || (w.events as string[]).includes('*'),
    );

    if (active.length === 0) return;

    const body = JSON.stringify({
      event: eventType,
      timestamp: new Date().toISOString(),
      data: payload,
    });

    await Promise.allSettled(
      active.map(async (webhook) => {
        const signature = createHmac('sha256', webhook.secret).update(body).digest('hex');
        try {
          await fetch(webhook.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Kora-Signature': `sha256=${signature}`,
              'X-Kora-Event': eventType,
            },
            body,
            signal: AbortSignal.timeout(5000),
          });
        } catch { /* delivery errors are silent */ }
      }),
    );
  }
}
