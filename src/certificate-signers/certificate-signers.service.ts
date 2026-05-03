import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CertificateSigner } from './certificate-signer.entity';
import { EventsService } from '../events/events.service';
import { CreateCertificateSignerDto } from './dto/create-certificate-signer.dto';
import { UpdateCertificateSignerDto } from './dto/update-certificate-signer.dto';

const MAX_SIGNERS = 5;

@Injectable()
export class CertificateSignersService {
  constructor(
    @InjectRepository(CertificateSigner)
    private readonly signerRepo: Repository<CertificateSigner>,
    private readonly eventsService: EventsService,
  ) {}

  async create(eventId: string, organizerId: string, dto: CreateCertificateSignerDto): Promise<CertificateSigner> {
    await this.eventsService.findOne(eventId, organizerId);

    const count = await this.signerRepo.count({ where: { eventId } });
    if (count >= MAX_SIGNERS) {
      throw new BadRequestException(`Máximo de ${MAX_SIGNERS} assinantes por evento atingido`);
    }

    const signer = this.signerRepo.create({ ...dto, eventId });
    return this.signerRepo.save(signer);
  }

  async findByEvent(eventId: string, organizerId: string): Promise<CertificateSigner[]> {
    await this.eventsService.findOne(eventId, organizerId);
    return this.signerRepo.find({
      where: { eventId },
      order: { displayOrder: 'ASC' },
    });
  }

  private async findSigner(eventId: string, signerId: string): Promise<CertificateSigner> {
    const signer = await this.signerRepo.findOne({ where: { id: signerId, eventId } });
    if (!signer) throw new NotFoundException('Assinante não encontrado');
    return signer;
  }

  async update(
    eventId: string,
    signerId: string,
    organizerId: string,
    dto: UpdateCertificateSignerDto,
  ): Promise<CertificateSigner> {
    await this.eventsService.findOne(eventId, organizerId);
    const signer = await this.findSigner(eventId, signerId);
    Object.assign(signer, dto);
    return this.signerRepo.save(signer);
  }

  async updateSignature(
    eventId: string,
    signerId: string,
    organizerId: string,
    signatureUrl: string,
  ): Promise<CertificateSigner> {
    await this.eventsService.findOne(eventId, organizerId);
    const signer = await this.findSigner(eventId, signerId);
    signer.signatureUrl = signatureUrl;
    return this.signerRepo.save(signer);
  }

  async remove(eventId: string, signerId: string, organizerId: string): Promise<void> {
    await this.eventsService.findOne(eventId, organizerId);
    const signer = await this.findSigner(eventId, signerId);
    await this.signerRepo.remove(signer);
  }
}
