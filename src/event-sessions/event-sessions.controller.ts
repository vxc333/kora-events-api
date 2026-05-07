import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { EventSessionsService } from './event-sessions.service';
import { CreateEventSessionDto } from './dto/create-event-session.dto';
import { UpdateEventSessionDto } from './dto/update-event-session.dto';

@ApiTags('Event Sessions')
@Controller('events/:eventId/sessions')
export class EventSessionsController {
  constructor(private readonly sessionsService: EventSessionsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Criar sessão para evento recorrente' })
  create(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: CreateEventSessionDto,
    @CurrentUser() user: User,
  ) {
    return this.sessionsService.create(eventId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar sessões do evento (público)' })
  findAll(@Param('eventId', ParseUUIDPipe) eventId: string) {
    return this.sessionsService.findByEvent(eventId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':sessionId')
  @ApiOperation({ summary: 'Atualizar sessão' })
  update(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: UpdateEventSessionDto,
    @CurrentUser() user: User,
  ) {
    return this.sessionsService.update(eventId, sessionId, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':sessionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover sessão' })
  remove(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: User,
  ) {
    return this.sessionsService.remove(eventId, sessionId, user.id);
  }

  @Post(':sessionId/checkin/:qrToken')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check-in por QR numa sessão específica (público)' })
  checkinByQr(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('qrToken') qrToken: string,
  ) {
    return this.sessionsService.checkinByQr(sessionId, qrToken);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':sessionId/stats')
  @ApiOperation({ summary: 'Estatísticas de check-in da sessão' })
  getStats(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: User,
  ) {
    return this.sessionsService.getSessionStats(sessionId, user.id);
  }
}
