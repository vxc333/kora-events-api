import {
  Body, Controller, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Post, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { BroadcastsService } from './broadcasts.service';
import { CreateBroadcastDto } from './dto/create-broadcast.dto';

@ApiTags('Broadcasts')
@Controller('events/:eventId/broadcasts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BroadcastsController {
  constructor(private readonly broadcastsService: BroadcastsService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Disparar email para segmento de participantes' })
  send(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateBroadcastDto,
  ) {
    return this.broadcastsService.send(eventId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Histórico de disparos' })
  findAll(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: User,
  ) {
    return this.broadcastsService.findByEvent(eventId, user.id);
  }
}
