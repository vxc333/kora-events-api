import { Controller, Get, Param, ParseUUIDPipe, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CertificatesService } from './certificates.service';

@ApiTags('Certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Get('by-token/:qrToken')
  @ApiOperation({
    summary: 'Gerar e baixar certificado de participação (público)',
  })
  @ApiResponse({ status: 200, description: 'PDF gerado com sucesso' })
  @ApiResponse({ status: 403, description: 'Certificado não disponível' })
  @ApiResponse({ status: 404, description: 'Token inválido' })
  async getCertificate(
    @Param('qrToken') qrToken: string,
    @Res() res: Response,
  ): Promise<void> {
    const { pdf, slug } = await this.certificatesService.generate(qrToken);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="certificado-${slug}.pdf"`,
    });
    res.send(pdf);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('by-participant/:participantId')
  @ApiOperation({
    summary: 'Gerar e baixar certificado de um participante específico (admin)',
  })
  @ApiResponse({ status: 200, description: 'PDF gerado com sucesso' })
  @ApiResponse({ status: 404, description: 'Participante não encontrado' })
  async getCertificateByParticipant(
    @Param('participantId', ParseUUIDPipe) participantId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { pdf, slug } = await this.certificatesService.generateByParticipantId(participantId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="certificado-${slug}.pdf"`,
    });
    res.send(pdf);
  }
}
