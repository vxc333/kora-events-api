import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@Controller()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('notifications')
  @ApiOperation({ summary: 'Listar notificações do participante via qrToken (público)' })
  @ApiQuery({ name: 'qrToken', required: true })
  findByParticipant(@Query('qrToken') qrToken: string) {
    return this.notificationsService.findByQrToken(qrToken);
  }

  @Post('notifications/read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar todas as notificações como lidas (público)' })
  @ApiQuery({ name: 'qrToken', required: true })
  markAllRead(@Query('qrToken') qrToken: string) {
    return this.notificationsService.markAllRead(qrToken);
  }

  @Post('notifications/:id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar notificação como lida via qrToken (público)' })
  @ApiQuery({ name: 'qrToken', required: true })
  markRead(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('qrToken') qrToken: string,
  ) {
    return this.notificationsService.markRead(id, qrToken);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('events/:eventId/notifications')
  @ApiOperation({ summary: 'Listar todas as notificações do evento (organizador)' })
  findByEvent(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: User,
  ) {
    return this.notificationsService.findByEvent(eventId, user.id);
  }
}
