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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { EventPartnersService } from './event-partners.service';
import { CreateEventPartnerDto } from './dto/create-event-partner.dto';
import { UpdateEventPartnerDto } from './dto/update-event-partner.dto';

const partnerLogoStorage = diskStorage({
  destination: join(process.cwd(), 'uploads', 'partners'),
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
});

const imageFilter = (
  _req: unknown,
  file: Express.Multer.File,
  cb: (e: Error | null, accept: boolean) => void,
) => {
  cb(null, file.mimetype.startsWith('image/'));
};

@ApiTags('Event Partners')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('events/:eventId/partners')
export class EventPartnersController {
  constructor(private readonly partnersService: EventPartnersService) {}

  @Post()
  @ApiOperation({ summary: 'Adicionar parceiro ao evento' })
  create(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateEventPartnerDto,
  ) {
    return this.partnersService.create(eventId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar parceiros ordenados por displayOrder' })
  findByEvent(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: User,
  ) {
    return this.partnersService.findByEvent(eventId, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar nome ou ordem do parceiro' })
  update(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateEventPartnerDto,
  ) {
    return this.partnersService.update(eventId, id, user.id, dto);
  }

  @Post(':id/logo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload da logo do parceiro (max 5 MB, image/*)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: partnerLogoStorage,
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: imageFilter,
    }),
  )
  async uploadLogo(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const logoUrl = `/uploads/partners/${file.filename}`;
    return this.partnersService.updateLogo(eventId, id, user.id, logoUrl);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover parceiro (deleta arquivo de logo)' })
  remove(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.partnersService.remove(eventId, id, user.id);
  }
}
