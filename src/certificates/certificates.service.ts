import * as fs from 'fs';
import * as path from 'path';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Participant } from '../participants/participant.entity';
import { Event, CertificateTemplate } from '../events/event.entity';
import { CertificateSigner } from '../certificate-signers/certificate-signer.entity';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfmake = require('pdfmake');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Helvetica = require('pdfmake/standard-fonts/Helvetica');

pdfmake.addFonts(Helvetica);
pdfmake.setUrlAccessPolicy(() => false);

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

    const logoData = this.loadImageAsBase64(event.logoUrl);
    const signatureImages = signers.map((s) => this.loadImageAsBase64(s.signatureUrl));
    const docDefinition = this.buildDocDefinition(participant, event, signers, logoData, signatureImages);

    const doc = pdfmake.createPdf(docDefinition);
    const pdf = await doc.getBuffer();
    return { pdf, slug: event.slug };
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

  private buildDocDefinition(
    participant: Participant,
    event: Event,
    signers: CertificateSigner[],
    logoData: string | undefined,
    signatureImages: (string | undefined)[],
  ) {
    const color = event.primaryColor;
    const dateStr = event.startDate.toLocaleDateString('pt-BR');
    const code = participant.qrToken.substring(0, 8).toUpperCase();

    const signerColumns = signers.map((s, i) => ({
      stack: [
        ...(signatureImages[i]
          ? [{ image: signatureImages[i], width: 80, alignment: 'center', margin: [0, 0, 0, 4] }]
          : [{ text: '', margin: [0, 36, 0, 4] }]),
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 100, y2: 0, lineWidth: 0.5, lineColor: '#555' }] },
        { text: s.name, fontSize: 10, bold: true, alignment: 'center', margin: [0, 4, 0, 0] },
        { text: s.title, fontSize: 9, alignment: 'center', color: '#666' },
      ],
      width: '*',
    }));

    const workloadLine = event.workloadHours != null
      ? [{ text: `com carga horária de ${event.workloadHours} horas`, alignment: 'center', color: '#666', margin: [0, 0, 0, 16] }]
      : [];

    const cpfLine = participant.cpf
      ? [{ text: `CPF: ${participant.cpf}`, fontSize: 9, color: '#888', margin: [0, 0, 0, 4] }]
      : [];

    if (event.certificateTemplate === CertificateTemplate.LANDSCAPE) {
      const workloadInfo = event.workloadHours != null ? `  ·  ${event.workloadHours}h` : '';
      return {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [60, 50, 60, 50],
        content: [
          {
            columns: [
              {
                width: '55%',
                stack: [
                  ...(logoData ? [{ image: logoData, width: 70, margin: [0, 0, 0, 16] }] : []),
                  { text: 'CERTIFICADO DE PARTICIPAÇÃO', fontSize: 10, bold: true, color: '#555', margin: [0, 0, 0, 12] },
                  { text: 'Certificamos que', fontSize: 10, color: '#888', margin: [0, 0, 0, 4] },
                  { text: participant.name, fontSize: 26, bold: true, color, margin: [0, 0, 0, 12] },
                  ...cpfLine,
                  { text: 'participou do evento', fontSize: 10, color: '#888', margin: [0, 0, 0, 4] },
                  { text: event.title, fontSize: 14, bold: true, color: '#1a1a2e', margin: [0, 0, 0, 6] },
                  { text: `${dateStr}${workloadInfo}`, fontSize: 10, color: '#666' },
                  { text: `Código: ${code}`, fontSize: 8, color: '#bbb', margin: [0, 16, 0, 0] },
                ],
              },
              {
                width: 1,
                stack: [{ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 0, y2: 440, lineWidth: 1, lineColor: color }] }],
                margin: [20, 0, 20, 0],
              },
              {
                width: '*',
                stack: [
                  { text: 'Assinaturas', fontSize: 9, color: '#888', margin: [0, 0, 0, 20] },
                  ...(signerColumns.length > 0 ? [{ columns: signerColumns }] : []),
                ],
                margin: [0, 60, 0, 0],
              },
            ],
          },
        ],
        defaultStyle: { font: 'Helvetica', fontSize: 11 },
      };
    }

    if (event.certificateTemplate === CertificateTemplate.MINIMALIST) {
      const workloadText = event.workloadHours != null
        ? [{ text: `${dateStr}  ·  ${event.workloadHours} horas`, fontSize: 11, color: '#aaa', alignment: 'center', margin: [0, 0, 0, 60] }]
        : [{ text: dateStr, fontSize: 11, color: '#aaa', alignment: 'center', margin: [0, 0, 0, 60] }];
      return {
        pageSize: 'A4',
        pageMargins: [80, 80, 80, 80],
        content: [
          ...(logoData
            ? [{ image: logoData, width: 60, alignment: 'center', margin: [0, 0, 0, 40] }]
            : [{ text: '', margin: [0, 20, 0, 0] }]),
          { text: 'CERTIFICADO', fontSize: 9, bold: true, color: '#aaa', alignment: 'center', margin: [0, 0, 0, 16] },
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 435, y2: 0, lineWidth: 1, lineColor: color }], margin: [0, 0, 0, 40] },
          { text: participant.name, fontSize: 32, bold: true, color: '#1a1a2e', alignment: 'center', margin: [0, 0, 0, 8] },
          ...(participant.cpf ? [{ text: `CPF: ${participant.cpf}`, fontSize: 9, color: '#aaa', alignment: 'center', margin: [0, 0, 0, 16] }] : [{ text: '', margin: [0, 0, 0, 24] }]),
          { text: 'participou de', fontSize: 11, color: '#999', alignment: 'center', margin: [0, 0, 0, 8] },
          { text: event.title, fontSize: 16, bold: true, color: '#1a1a2e', alignment: 'center', margin: [0, 0, 0, 8] },
          ...workloadText,
          ...(signerColumns.length > 0 ? [{ columns: signerColumns, margin: [0, 0, 0, 24] }] : []),
          { text: `Código ${code}`, fontSize: 8, color: '#ccc', alignment: 'center' },
        ],
        defaultStyle: { font: 'Helvetica', fontSize: 11 },
      };
    }

    // DEFAULT (portrait A4)
    return {
      pageSize: 'A4',
      pageMargins: [60, 60, 60, 60],
      content: [
        ...(logoData ? [{ image: logoData, width: 80, alignment: 'center', margin: [0, 0, 0, 20] }] : []),
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 475, y2: 0, lineWidth: 3, lineColor: color }], margin: [0, 0, 0, 30] },
        { text: 'CERTIFICADO DE PARTICIPAÇÃO', fontSize: 18, bold: true, alignment: 'center', color: '#1a1a2e', margin: [0, 0, 0, 32] },
        { text: 'Certificamos que', alignment: 'center', color: '#888', margin: [0, 0, 0, 8] },
        { text: participant.name, fontSize: 28, bold: true, alignment: 'center', color, margin: [0, 0, 0, 8] },
        ...(participant.cpf ? [{ text: `CPF: ${participant.cpf}`, fontSize: 9, alignment: 'center', color: '#bbb', margin: [0, 0, 0, 8] }] : [{ text: '', margin: [0, 0, 0, 8] }]),
        { text: 'participou do evento', alignment: 'center', color: '#888', margin: [0, 0, 0, 8] },
        { text: event.title, fontSize: 16, bold: true, alignment: 'center', color: '#1a1a2e', margin: [0, 0, 0, 8] },
        { text: `realizado em ${dateStr}`, alignment: 'center', color: '#666', margin: [0, 0, 0, 4] },
        ...workloadLine,
        { text: `Código de validação: ${code}`, fontSize: 9, alignment: 'center', color: '#bbb' },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 475, y2: 0, lineWidth: 1, lineColor: color }], margin: [0, 40, 0, 20] },
        ...(signerColumns.length > 0 ? [{ columns: signerColumns }] : []),
      ],
      defaultStyle: { font: 'Helvetica', fontSize: 11 },
    };
  }
}
