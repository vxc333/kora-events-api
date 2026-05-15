import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@Controller('events/:eventId')
export class MinimumAttendanceController {
  constructor(private readonly reportsService: ReportsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('minimum-attendance')
  @ApiOperation({ summary: 'Presença mínima por sessão — elegibilidade de certificado' })
  getMinimumAttendance(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser('id') organizerId: string,
  ) {
    return this.reportsService.getMinimumAttendance(eventId, organizerId);
  }
}
