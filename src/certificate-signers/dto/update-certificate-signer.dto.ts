import { PartialType } from '@nestjs/swagger';
import { CreateCertificateSignerDto } from './create-certificate-signer.dto';

export class UpdateCertificateSignerDto extends PartialType(CreateCertificateSignerDto) {}
