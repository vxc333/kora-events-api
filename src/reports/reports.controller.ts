import { Controller, Get, Param, ParseUUIDPipe, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('events/:eventId/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('attendance')
  @ApiOperation({ summary: 'Baixar relatório de presença em PDF' })
  async getAttendancePdf(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser('id') organizerId: string,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.reportsService.generateAttendancePdf(eventId, organizerId);
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `attachment; filename="relatorio-presenca-${eventId}.pdf"`);
    res.send(buffer);
  }
}
