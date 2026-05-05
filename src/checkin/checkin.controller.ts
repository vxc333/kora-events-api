import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CheckinService } from './checkin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { CheckinByCpfDto } from './dto/checkin-by-cpf.dto';
import { CheckinByNameDto } from './dto/checkin-by-name.dto';

@ApiTags('Checkin')
@Controller()
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  @Post('checkin/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Realiza check-in via QR token (público)' })
  @ApiResponse({ status: 200, description: 'Check-in realizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Token inválido' })
  @ApiResponse({ status: 409, description: 'Participante já fez check-in' })
  checkin(@Param('token') token: string) {
    return this.checkinService.checkin(token);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('checkin/by-cpf')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Realiza check-in manual via CPF (operador autenticado)' })
  @ApiResponse({ status: 200, description: 'Check-in realizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Participante não encontrado' })
  @ApiResponse({ status: 409, description: 'Participante já fez check-in' })
  checkinByCpf(@Body() dto: CheckinByCpfDto, @CurrentUser() user: User) {
    return this.checkinService.checkinByCpf(dto, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('checkin/by-name')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Realiza check-in manual via nome (operador autenticado)' })
  @ApiResponse({ status: 200, description: 'Check-in realizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Nome ambíguo — mais de um participante encontrado' })
  @ApiResponse({ status: 404, description: 'Participante não encontrado' })
  @ApiResponse({ status: 409, description: 'Participante já fez check-in' })
  checkinByName(@Body() dto: CheckinByNameDto, @CurrentUser() user: User) {
    return this.checkinService.checkinByName(dto, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('events/:eventId/checkin/stats')
  @ApiOperation({ summary: 'Estatísticas de check-in do evento' })
  @ApiResponse({ status: 200, description: 'Estatísticas retornadas' })
  @ApiResponse({ status: 404, description: 'Evento não encontrado' })
  getStats(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: User,
  ) {
    return this.checkinService.getStats(eventId, user.id);
  }
}
