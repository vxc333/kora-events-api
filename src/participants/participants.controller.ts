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
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { ParticipantsService } from './participants.service';
import { RegisterParticipantDto } from './dto/register-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { ListParticipantsDto } from './dto/list-participants.dto';

@ApiTags('Participants')
@Controller('events/:eventId/participants')
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Post()
  @ApiOperation({ summary: 'Inscrever participante (público)' })
  register(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: RegisterParticipantDto,
  ) {
    return this.participantsService.register(eventId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Listar participantes com filtros e paginação' })
  findAll(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Query() query: ListParticipantsDto,
  ) {
    return this.participantsService.findAll(eventId, query);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('export')
  @ApiOperation({ summary: 'Exportar participantes em CSV' })
  async exportCsv(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const csv = await this.participantsService.exportCsv(eventId, user.id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="participantes-${eventId}.csv"`);
    res.send('﻿' + csv); // BOM para Excel abrir com encoding correto
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('csv')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Importar participantes via CSV (colunas: name, email, cpf, ticketId)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async importCsv(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const content = file.buffer.toString('utf-8');
    const lines = content.split('\n').filter((l) => l.trim());
    const [header, ...dataLines] = lines;
    const cols = header.split(',').map((c) => c.trim().toLowerCase());

    const rows = dataLines.map((line) => {
      const values = line.split(',').map((v) => v.trim());
      return Object.fromEntries(cols.map((col, i) => [col, values[i] || undefined])) as {
        name: string;
        email: string;
        cpf?: string;
        ticketId?: string;
      };
    });

    return this.participantsService.importCsv(eventId, rows);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: 'Editar participante' })
  update(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateParticipantDto,
  ) {
    return this.participantsService.update(eventId, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar inscrição (status → CANCELLED, libera vaga)' })
  cancel(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.participantsService.cancel(eventId, id);
  }
}
