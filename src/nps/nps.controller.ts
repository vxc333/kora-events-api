import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NpsService } from './nps.service';

class SubmitNpsDto {
  @ApiProperty({ minimum: 0, maximum: 10 })
  @IsInt()
  @Min(0)
  @Max(10)
  score: number;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty()
  @IsUUID()
  respondentToken: string;
}

@ApiTags('NPS')
@ApiBearerAuth()
@Controller('events/:eventId/nps')
export class NpsController {
  constructor(private readonly npsService: NpsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obter resumo NPS do evento' })
  getEventNps(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser('id') organizerId: string,
  ) {
    return this.npsService.getEventNps(eventId, organizerId);
  }

  @Get('export')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Exportar respostas NPS em CSV' })
  async exportNpsCsv(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser('id') organizerId: string,
    @Res() res: Response,
  ): Promise<void> {
    const csv = await this.npsService.exportNpsCsv(eventId, organizerId);
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set(
      'Content-Disposition',
      `attachment; filename="nps-${eventId}.csv"`,
    );
    res.send('﻿' + csv);
  }
}

@ApiTags('NPS (Public)')
@Controller('public/nps')
export class PublicNpsController {
  constructor(private readonly npsService: NpsService) {}

  @Post(':eventId')
  @ApiOperation({ summary: 'Enviar resposta NPS (público)' })
  submitNps(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() body: SubmitNpsDto,
  ): Promise<void> {
    return this.npsService.submitNps(
      eventId,
      body.score,
      body.comment ?? null,
      body.respondentToken,
    );
  }
}
