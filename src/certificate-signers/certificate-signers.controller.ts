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
import { CertificateSignersService } from './certificate-signers.service';
import { CreateCertificateSignerDto } from './dto/create-certificate-signer.dto';
import { UpdateCertificateSignerDto } from './dto/update-certificate-signer.dto';

const signatureStorage = diskStorage({
  destination: join(process.cwd(), 'uploads', 'signatures'),
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
});

const imageFilter = (
  _req: unknown,
  file: Express.Multer.File,
  cb: (e: Error | null, accept: boolean) => void,
) => {
  cb(null, file.mimetype.startsWith('image/'));
};

@ApiTags('Certificate Signers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('events/:eventId/signers')
export class CertificateSignersController {
  constructor(private readonly signersService: CertificateSignersService) {}

  @Post()
  @ApiOperation({ summary: 'Adicionar assinante ao certificado (máx. 5)' })
  create(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateCertificateSignerDto,
  ) {
    return this.signersService.create(eventId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar assinantes ordenados por displayOrder' })
  findByEvent(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser() user: User,
  ) {
    return this.signersService.findByEvent(eventId, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar nome, cargo ou ordem do assinante' })
  update(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateCertificateSignerDto,
  ) {
    return this.signersService.update(eventId, id, user.id, dto);
  }

  @Post(':id/signature')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload da imagem de assinatura (max 2 MB, image/*)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: signatureStorage,
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: imageFilter,
    }),
  )
  async uploadSignature(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const signatureUrl = `/uploads/signatures/${file.filename}`;
    return this.signersService.updateSignature(eventId, id, user.id, signatureUrl);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover assinante' })
  remove(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.signersService.remove(eventId, id, user.id);
  }
}
