import { IsArray, IsEnum, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WebhookEventType } from '../webhook-endpoint.entity';

export class CreateWebhookDto {
  @ApiProperty({ example: 'https://meusite.com/webhooks/kora' })
  @IsUrl()
  url: string;

  @ApiProperty({ enum: WebhookEventType, isArray: true })
  @IsArray()
  @IsEnum(WebhookEventType, { each: true })
  events: WebhookEventType[];
}
