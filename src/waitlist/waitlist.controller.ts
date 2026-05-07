import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { WaitlistService } from './waitlist.service';
import { JoinWaitlistDto } from './dto/join-waitlist.dto';

@ApiTags('Waitlist')
@Controller()
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post('events/:eventId/tickets/:ticketId/waitlist')
  @ApiOperation({ summary: 'Entrar na lista de espera (público)' })
  join(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Body() dto: JoinWaitlistDto,
  ) {
    return this.waitlistService.join(eventId, ticketId, dto);
  }

  @Delete('events/:eventId/tickets/:ticketId/waitlist/me')
  @ApiOperation({ summary: 'Sair da lista de espera (público)' })
  leave(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Body('email') email: string,
  ) {
    return this.waitlistService.leave(ticketId, email);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('events/:eventId/waitlist')
  @ApiOperation({ summary: 'Listar fila de espera (organizador)' })
  listByEvent(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: User,
  ) {
    return this.waitlistService.listByEvent(eventId, user.id);
  }

  @Get('waitlist/claim/:token')
  @ApiOperation({ summary: 'Resolver token de claim para pré-preenchimento' })
  resolveClaim(@Param('token') token: string) {
    return this.waitlistService.resolveClaimToken(token);
  }
}
