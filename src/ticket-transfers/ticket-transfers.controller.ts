import {
  Body,
  Controller,
  Delete,
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
import { TicketTransfersService } from './ticket-transfers.service';
import { InitiateTransferDto } from './dto/initiate-transfer.dto';

@ApiTags('Ticket Transfers')
@Controller()
export class TicketTransfersController {
  constructor(private readonly transfersService: TicketTransfersService) {}

  @Post('events/:eventId/transfers')
  @ApiOperation({ summary: 'Iniciar transferência de ingresso (público via qrToken)' })
  initiate(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: InitiateTransferDto,
  ) {
    return this.transfersService.initiate(eventId, dto);
  }

  @Post('transfers/:token/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aceitar transferência de ingresso (público)' })
  accept(@Param('token') token: string) {
    return this.transfersService.accept(token);
  }

  @Delete('transfers/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar transferência pendente (público via qrToken)' })
  @ApiQuery({ name: 'qrToken', required: true })
  cancel(
    @Param('token') token: string,
    @Query('qrToken') qrToken: string,
  ) {
    return this.transfersService.cancel(token, qrToken);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('events/:eventId/transfers')
  @ApiOperation({ summary: 'Listar transferências do evento (organizador)' })
  findByEvent(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: User,
  ) {
    return this.transfersService.findByEvent(eventId, user.id);
  }
}
