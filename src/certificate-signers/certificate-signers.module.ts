import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertificateSignersController } from './certificate-signers.controller';
import { CertificateSignersService } from './certificate-signers.service';
import { CertificateSigner } from './certificate-signer.entity';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [TypeOrmModule.forFeature([CertificateSigner]), EventsModule],
  controllers: [CertificateSignersController],
  providers: [CertificateSignersService],
  exports: [CertificateSignersService],
})
export class CertificateSignersModule {}
