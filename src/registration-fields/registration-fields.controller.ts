import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe,
  Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { RegistrationFieldsService } from './registration-fields.service';
import { CreateRegistrationFieldDto } from './dto/create-registration-field.dto';
import { UpdateRegistrationFieldDto } from './dto/update-registration-field.dto';

@ApiTags('Registration Fields')
@Controller('events/:eventId/fields')
export class RegistrationFieldsController {
  constructor(private readonly service: RegistrationFieldsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Criar campo de inscrição' })
  create(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateRegistrationFieldDto,
  ) {
    return this.service.create(eventId, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Listar campos (organizador)' })
  findAll(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: User,
  ) {
    return this.service.findByEvent(eventId, user.id);
  }

  @Get('public')
  @ApiOperation({ summary: 'Campos visíveis para inscrição pública' })
  findPublic(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Query('ticketId', new ParseUUIDPipe({ optional: true })) ticketId?: string,
  ) {
    return this.service.findPublic(eventId, ticketId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':fieldId')
  @ApiOperation({ summary: 'Editar campo' })
  update(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('fieldId', ParseUUIDPipe) fieldId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateRegistrationFieldDto,
  ) {
    return this.service.update(eventId, fieldId, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':fieldId')
  @ApiOperation({ summary: 'Remover campo' })
  remove(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('fieldId', ParseUUIDPipe) fieldId: string,
    @CurrentUser() user: User,
  ) {
    return this.service.remove(eventId, fieldId, user.id);
  }
}
