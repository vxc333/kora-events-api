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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@ApiTags('Tickets')
@Controller('events/:eventId/tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get('available')
  @ApiOperation({ summary: 'Lista ingressos disponíveis do evento (público)' })
  findAvailable(@Param('eventId', ParseUUIDPipe) eventId: string) {
    return this.ticketsService.findAvailable(eventId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Cria ingresso para o evento' })
  @ApiResponse({ status: 201, description: 'Ingresso criado' })
  @ApiResponse({ status: 501, description: 'Pagamentos não implementados (price > 0)' })
  create(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: CreateTicketDto,
  ) {
    return this.ticketsService.create(eventId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Lista todos os ingressos do evento' })
  findByEvent(@Param('eventId', ParseUUIDPipe) eventId: string) {
    return this.ticketsService.findByEvent(eventId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza ingresso' })
  update(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.ticketsService.update(eventId, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove ingresso (apenas se quantitySold === 0)' })
  @ApiResponse({ status: 204, description: 'Removido com sucesso' })
  @ApiResponse({ status: 400, description: 'Ingresso com vendas não pode ser removido' })
  remove(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ticketsService.remove(eventId, id);
  }
}
