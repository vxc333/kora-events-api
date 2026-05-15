import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PortalService } from './portal.service';

@ApiTags('Portal')
@Controller('portal')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Post('login')
  @ApiOperation({ summary: 'Autenticar participante via CPF + e-mail' })
  login(@Body() body: { cpf: string; email: string }) {
    return this.portalService.login(body.cpf, body.email);
  }

  @Get('events')
  @ApiOperation({ summary: 'Listar eventos e inscrições do participante' })
  getEvents(@Query('qrToken') qrToken: string) {
    return this.portalService.getEvents(qrToken);
  }

  @Get('certificate/:eventId')
  @ApiOperation({ summary: 'Baixar certificado de um evento específico' })
  async getCertificate(
    @Query('qrToken') qrToken: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Res() res: Response,
  ) {
    const { pdf, slug } = await this.portalService.downloadCertificate(qrToken, eventId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="certificado-${slug}.pdf"`,
    });
    res.send(pdf);
  }

  // ── Portal course routes ──────────────────────────────────────────────────

  @Get('courses')
  @ApiOperation({ summary: 'Listar cursos disponíveis para o participante' })
  getPortalCourses(@Query('qrToken') qrToken: string) {
    return this.portalService.getPortalCourses(qrToken);
  }

  @Get('courses/:courseId')
  @ApiOperation({ summary: 'Obter detalhes de um curso com progresso do participante' })
  getPortalCourse(
    @Query('qrToken') qrToken: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.portalService.getPortalCourse(qrToken, courseId);
  }

  @Post('courses/:courseId/modules/:moduleId/complete')
  @HttpCode(200)
  @ApiOperation({ summary: 'Marcar módulo como concluído (portal)' })
  completePortalModule(
    @Query('qrToken') qrToken: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
  ) {
    return this.portalService.completePortalModule(qrToken, courseId, moduleId);
  }
}
