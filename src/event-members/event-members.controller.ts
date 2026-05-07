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
import { EventMembersService } from './event-members.service';
import { CreateEventMemberDto } from './dto/create-event-member.dto';
import { UpdateEventMemberDto } from './dto/update-event-member.dto';

@ApiTags('Event Members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('events/:eventId/members')
export class EventMembersController {
  constructor(private readonly eventMembersService: EventMembersService) {}

  @Post()
  @ApiOperation({ summary: 'Convidar membro para o evento (somente dono)' })
  addMember(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: CreateEventMemberDto,
    @CurrentUser() user: User,
  ) {
    return this.eventMembersService.addMember(eventId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar membros do evento' })
  findAll(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: User,
  ) {
    return this.eventMembersService.findByEvent(eventId, user.id);
  }

  @Patch(':memberId')
  @ApiOperation({ summary: 'Atualizar role de membro (somente dono)' })
  updateRole(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateEventMemberDto,
    @CurrentUser() user: User,
  ) {
    return this.eventMembersService.updateRole(eventId, memberId, user.id, dto);
  }

  @Delete(':memberId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover membro do evento (somente dono)' })
  removeMember(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser() user: User,
  ) {
    return this.eventMembersService.removeMember(eventId, memberId, user.id);
  }
}
