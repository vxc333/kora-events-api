import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('engagement')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get engagement metrics for all events by the authenticated organizer' })
  getEngagement(@CurrentUser('id') userId: string) {
    return this.analyticsService.getEngagement(userId);
  }
}
