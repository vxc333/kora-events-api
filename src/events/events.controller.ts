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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventStatus } from './event.entity';

const eventImageStorage = diskStorage({
  destination: join(process.cwd(), 'uploads', 'events'),
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
});

const imageFilter = (
  _req: unknown,
  file: Express.Multer.File,
  cb: (e: Error | null, accept: boolean) => void,
) => {
  cb(null, file.mimetype.startsWith('image/'));
};

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get('public/:slug')
  @ApiOperation({ summary: 'Página pública do evento' })
  @ApiResponse({ status: 200, description: 'Evento encontrado' })
  @ApiResponse({ status: 404, description: 'Evento não encontrado' })
  findBySlug(@Param('slug') slug: string) {
    return this.eventsService.findBySlug(slug);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Cria um novo evento' })
  @ApiResponse({ status: 201, description: 'Evento criado' })
  @ApiResponse({ status: 403, description: 'Limite de eventos do plano FREE atingido' })
  create(@CurrentUser() user: User, @Body() dto: CreateEventDto) {
    return this.eventsService.create(dto, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('my')
  @ApiOperation({ summary: 'Lista eventos do organizador autenticado (paginado)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: EventStatus })
  findMyEvents(
    @CurrentUser() user: User,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('status') status?: EventStatus,
  ) {
    return this.eventsService.findMyEvents(user.id, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      status,
    });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do evento (apenas do próprio organizador)' })
  @ApiResponse({ status: 404, description: 'Evento não encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.eventsService.findOne(id, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza campos do evento' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.update(id, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancela o evento (soft delete — muda status para CANCELLED)' })
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.eventsService.cancel(id, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publica o evento (muda status para PUBLISHED)' })
  publish(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.eventsService.publish(id, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(':id/finish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Finaliza o evento (muda status para FINISHED)' })
  finish(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.eventsService.finish(id, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id/stats')
  @ApiOperation({ summary: 'Estatísticas do evento' })
  getStats(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.eventsService.getStats(id, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(':id/banner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload do banner do evento (max 5 MB, image/*)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: eventImageStorage,
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: imageFilter,
    }),
  )
  async uploadBanner(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const bannerUrl = `/uploads/events/${file.filename}`;
    return this.eventsService.updateBanner(id, user.id, bannerUrl);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(':id/logo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload do logo do evento (max 5 MB, image/*)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: eventImageStorage,
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: imageFilter,
    }),
  )
  async uploadLogo(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const logoUrl = `/uploads/events/${file.filename}`;
    return this.eventsService.updateLogo(id, user.id, logoUrl);
  }
}
