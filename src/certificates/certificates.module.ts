import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';
import { Participant } from '../participants/participant.entity';
import { Event } from '../events/event.entity';
import { CertificateSigner } from '../certificate-signers/certificate-signer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Participant, Event, CertificateSigner])],
  controllers: [CertificatesController],
  providers: [CertificatesService],
  exports: [CertificatesService],
})
export class CertificatesModule {}
