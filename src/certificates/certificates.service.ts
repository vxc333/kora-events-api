import * as fs from 'fs';
import * as path from 'path';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Participant } from '../participants/participant.entity';
import { Event, CertificateTemplate } from '../events/event.entity';
import { CertificateSigner } from '../certificate-signers/certificate-signer.entity';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const puppeteer = require('puppeteer');

const GOOGLE_FONTS = `
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700&family=Dancing+Script:wght@600&display=block" rel="stylesheet">
`;

@Injectable()
export class CertificatesService {
  constructor(
    @InjectRepository(Participant)
    private readonly participantRepo: Repository<Participant>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(CertificateSigner)
    private readonly signerRepo: Repository<CertificateSigner>,
  ) {}

  async generate(qrToken: string): Promise<{ pdf: Buffer; slug: string }> {
    const participant = await this.participantRepo.findOne({ where: { qrToken } });
    if (!participant) throw new NotFoundException('Participante não encontrado');

    const event = await this.eventRepo.findOne({ where: { id: participant.eventId } });
    if (!event) throw new NotFoundException('Evento não encontrado');

    const signers = await this.signerRepo.find({
      where: { eventId: participant.eventId },
      order: { displayOrder: 'ASC' },
    });

    if (!participant.certificateReleased) {
      const now = new Date();
      if (event.endDate >= now) {
        throw new ForbiddenException({
          message: 'Certificado ainda não disponível — o evento ainda não encerrou.',
          code: 'CERTIFICATE_NOT_AVAILABLE',
          reason: 'event_not_ended',
        });
      }
      if (!participant.checkedInAt) {
        throw new ForbiddenException({
          message: 'Certificado disponível apenas para participantes que realizaram check-in.',
          code: 'CERTIFICATE_NOT_AVAILABLE',
          reason: 'no_checkin',
        });
      }
    }

    const pdf = await this.buildAndRenderPdf(participant, event, signers);
    return { pdf, slug: event.slug };
  }

  async generateByParticipantId(participantId: string): Promise<{ pdf: Buffer; slug: string }> {
    const participant = await this.participantRepo.findOne({ where: { id: participantId } });
    if (!participant) throw new NotFoundException('Participante não encontrado');

    const event = await this.eventRepo.findOne({ where: { id: participant.eventId } });
    if (!event) throw new NotFoundException('Evento não encontrado');

    const signers = await this.signerRepo.find({
      where: { eventId: participant.eventId },
      order: { displayOrder: 'ASC' },
    });

    const pdf = await this.buildAndRenderPdf(participant, event, signers);
    return { pdf, slug: event.slug };
  }

  private async buildAndRenderPdf(
    participant: Participant,
    event: Event,
    signers: CertificateSigner[],
  ): Promise<Buffer> {
    const logoData = this.loadImageAsBase64(event.logoUrl);
    const signatureImages = signers.map((s) => this.loadImageAsBase64(s.signatureUrl));
    const isLandscape = event.certificateTemplate === CertificateTemplate.LANDSCAPE;
    const html = this.buildCertHtml(participant, event, signers, logoData, signatureImages);
    return this.renderHtmlToPdf(html, isLandscape);
  }

  private async renderHtmlToPdf(html: string, landscape: boolean): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.evaluateHandle(() => document.fonts.ready);
      const pdf = await page.pdf({
        format: 'A4',
        landscape,
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
        scale: 96 / 72, // HTML designed at 72 DPI (PDF points); Puppeteer renders at 96 DPI CSS pixels
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  private buildCertHtml(
    participant: Participant,
    event: Event,
    signers: CertificateSigner[],
    logoData: string | undefined,
    signatureImages: (string | undefined)[],
  ): string {
    const color = event.primaryColor || '#5B21B6';
    const dateStr = new Date(event.startDate).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const code = participant.qrToken.substring(0, 8).toUpperCase();

    const defaultBody = event.workloadHours
      ? `Certificamos que {{nome}} participou de {{evento}}, realizado em {{data}}, com carga horária de {{carga_horaria}}.`
      : `Certificamos que {{nome}} participou de {{evento}}, realizado em {{data}}.`;
    const bodyTemplate = event.certificateBodyText || defaultBody;

    const bodyHtml = this.substituteVars(bodyTemplate, {
      nome: `<span style="font-weight:700;color:${color};letter-spacing:-0.01em;">${this.escape(participant.name)}</span>`,
      cpf: participant.cpf ? `<span style="font-family:monospace;">${this.escape(participant.cpf)}</span>` : '',
      email: this.escape(participant.email),
      evento: `<span style="font-weight:600;">${this.escape(event.title)}</span>`,
      data: dateStr,
      carga_horaria: event.workloadHours ? `${event.workloadHours} horas` : '',
      codigo: `<span style="font-family:monospace;opacity:0.7;">${code}</span>`,
    });

    const logoHtml = logoData
      ? `<img src="${logoData}" style="height:60px;object-fit:contain;display:block;margin:0 auto 20px;">`
      : '';

    if (event.certificateTemplate === CertificateTemplate.LANDSCAPE) {
      return this.buildLandscapeHtml(color, logoHtml, bodyHtml, signers, signatureImages, code);
    }
    if (event.certificateTemplate === CertificateTemplate.MINIMALIST) {
      return this.buildMinimalistHtml(color, logoHtml, bodyHtml, signers, signatureImages, code);
    }
    return this.buildDefaultHtml(color, logoHtml, bodyHtml, signers, signatureImages, code);
  }

  private buildDefaultHtml(
    color: string,
    logoHtml: string,
    bodyHtml: string,
    signers: CertificateSigner[],
    signatureImages: (string | undefined)[],
    code: string,
  ): string {
    const signersHtml = this.buildPortraitSignersHtml(signers, signatureImages);
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  ${GOOGLE_FONTS}
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 595px; height: 842px; overflow: hidden; background: white; }
    @page { size: A4 portrait; margin: 0; }
  </style>
</head>
<body>
  <div style="width:595px;height:842px;background:#fff;padding:60px;font-family:Georgia,serif;display:flex;flex-direction:column;">
    ${logoHtml}
    <div style="height:4px;background:${color};margin-bottom:32px;"></div>
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
      <div style="font-size:11px;font-family:'DM Sans',sans-serif;letter-spacing:0.15em;color:#888;text-transform:uppercase;margin-bottom:28px;">
        Certificado de Participação
      </div>
      <div style="font-size:16px;color:#333;line-height:1.8;font-family:'DM Sans',sans-serif;max-width:420px;margin-bottom:24px;">
        ${bodyHtml}
      </div>
      <div style="font-size:9px;color:#ccc;font-family:'DM Sans',sans-serif;letter-spacing:0.1em;margin-top:12px;">
        CÓDIGO DE VALIDAÇÃO: ${code}
      </div>
    </div>
    <div style="height:1px;background:${color};opacity:0.3;margin-bottom:24px;"></div>
    ${signersHtml}
  </div>
</body>
</html>`;
  }

  private buildLandscapeHtml(
    color: string,
    logoHtml: string,
    bodyHtml: string,
    signers: CertificateSigner[],
    signatureImages: (string | undefined)[],
    code: string,
  ): string {
    const logoSection = logoHtml ? `<div style="margin-bottom:16px;">${logoHtml}</div>` : '';
    const signersHtml = this.buildLandscapeSignersHtml(signers, signatureImages);
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  ${GOOGLE_FONTS}
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 842px; height: 595px; overflow: hidden; background: white; }
    @page { size: A4 landscape; margin: 0; }
  </style>
</head>
<body>
  <div style="width:842px;height:595px;background:#fff;padding:50px 60px;font-family:Georgia,serif;display:flex;align-items:stretch;">
    <div style="flex:0 0 55%;display:flex;flex-direction:column;justify-content:center;padding-right:40px;">
      ${logoSection}
      <div style="font-size:9px;font-family:'DM Sans',sans-serif;letter-spacing:0.15em;color:#888;text-transform:uppercase;margin-bottom:20px;">
        Certificado de Participação
      </div>
      <div style="font-size:14px;color:#333;line-height:1.85;font-family:'DM Sans',sans-serif;margin-bottom:16px;">
        ${bodyHtml}
      </div>
      <div style="font-size:8px;color:#bbb;margin-top:14px;font-family:'DM Sans',sans-serif;letter-spacing:0.08em;">
        Código: ${code}
      </div>
    </div>
    <div style="width:1px;background:${color};flex-shrink:0;"></div>
    <div style="flex:1;padding-left:40px;display:flex;flex-direction:column;justify-content:center;">
      <div style="font-size:9px;color:#888;font-family:'DM Sans',sans-serif;margin-bottom:24px;letter-spacing:0.1em;text-transform:uppercase;">
        Assinaturas
      </div>
      ${signersHtml}
    </div>
  </div>
</body>
</html>`;
  }

  private buildMinimalistHtml(
    color: string,
    logoHtml: string,
    bodyHtml: string,
    signers: CertificateSigner[],
    signatureImages: (string | undefined)[],
    code: string,
  ): string {
    const logoSection = logoHtml ? `<div style="margin-bottom:20px;">${logoHtml}</div>` : '';
    const signersHtml = this.buildPortraitSignersHtml(signers, signatureImages);
    const signersWrapper = signersHtml
      ? `<div style="margin-bottom:24px;">${signersHtml}</div>`
      : `<div style="height:60px;"></div>`;
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  ${GOOGLE_FONTS}
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 595px; height: 842px; overflow: hidden; background: white; }
    @page { size: A4 portrait; margin: 0; }
  </style>
</head>
<body>
  <div style="width:595px;height:842px;background:#fff;padding:80px;font-family:Georgia,serif;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
    ${logoSection}
    <div style="font-size:10px;font-family:'DM Sans',sans-serif;letter-spacing:0.2em;color:#aaa;text-transform:uppercase;margin-bottom:20px;">
      Certificado
    </div>
    <div style="height:1px;background:${color};width:100%;margin-bottom:40px;"></div>
    <div style="font-size:17px;color:#333;line-height:1.9;font-family:'DM Sans',sans-serif;max-width:380px;margin-bottom:48px;">
      ${bodyHtml}
    </div>
    ${signersWrapper}
    <div style="font-size:9px;color:#ccc;font-family:'DM Sans',sans-serif;letter-spacing:0.12em;">Código ${code}</div>
  </div>
</body>
</html>`;
  }

  private buildPortraitSignersHtml(
    signers: CertificateSigner[],
    signatureImages: (string | undefined)[],
  ): string {
    if (signers.length === 0) return '';
    return `<div style="display:flex;justify-content:center;gap:48px;">
      ${signers.slice(0, 3).map((s, i) => this.buildSignerCard(s, signatureImages[i])).join('')}
    </div>`;
  }

  private buildLandscapeSignersHtml(
    signers: CertificateSigner[],
    signatureImages: (string | undefined)[],
  ): string {
    if (signers.length === 0) return '';
    return `<div style="display:flex;flex-direction:column;gap:20px;">
      ${signers.slice(0, 3).map((s, i) => this.buildSignerCard(s, signatureImages[i])).join('')}
    </div>`;
  }

  private buildSignerCard(signer: CertificateSigner, signatureImage: string | undefined): string {
    const signatureContent = signatureImage
      ? `<img src="${signatureImage}" style="height:40px;max-width:120px;object-fit:contain;display:block;margin:0 auto 4px;">`
      : `<div style="font-family:'Dancing Script',cursive;font-size:22px;color:#333;font-weight:600;margin-bottom:4px;">${this.escape(signer.name)}</div>`;
    return `<div style="text-align:center;min-width:100px;">
      ${signatureContent}
      <div style="height:0.5px;background:#555;margin-bottom:5px;"></div>
      <div style="font-size:10px;font-weight:bold;color:#1a1a2e;font-family:'DM Sans',sans-serif;">${this.escape(signer.name)}</div>
      <div style="font-size:9px;color:#666;font-family:'DM Sans',sans-serif;">${this.escape(signer.title)}</div>
    </div>`;
  }

  private substituteVars(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
  }

  private escape(str: string): string {
    return (str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private loadImageAsBase64(url: string | null): string | undefined {
    if (!url) return undefined;
    try {
      const relativePath = url.replace(/^\//, '');
      const buffer = fs.readFileSync(path.join(process.cwd(), relativePath));
      const mime = url.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
      return `data:${mime};base64,${buffer.toString('base64')}`;
    } catch {
      return undefined;
    }
  }
}
