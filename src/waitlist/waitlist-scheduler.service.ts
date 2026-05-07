import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WaitlistService } from './waitlist.service';

@Injectable()
export class WaitlistSchedulerService {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async processExpiredClaims(): Promise<void> {
    await this.waitlistService.processExpired();
  }
}
