import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
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
}
