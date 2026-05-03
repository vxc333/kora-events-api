import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';

const mockPdf = Buffer.from('%PDF-test');

describe('CertificatesController', () => {
  let controller: CertificatesController;
  let service: jest.Mocked<CertificatesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CertificatesController],
      providers: [
        {
          provide: CertificatesService,
          useValue: {
            generate: jest.fn().mockResolvedValue({ pdf: mockPdf, slug: 'evento-teste' }),
          },
        },
      ],
    }).compile();

    controller = module.get<CertificatesController>(CertificatesController);
    service = module.get(CertificatesService);
  });

  it('should set Content-Type and Content-Disposition headers and send the PDF buffer', async () => {
    const res = { set: jest.fn(), send: jest.fn() } as unknown as import('express').Response;

    await controller.getCertificate('abc12345', res);

    expect(service.generate).toHaveBeenCalledWith('abc12345');
    expect(res.set).toHaveBeenCalledWith({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="certificado-evento-teste.pdf"',
    });
    expect(res.send).toHaveBeenCalledWith(mockPdf);
  });

  it('should propagate NotFoundException from service', async () => {
    service.generate.mockRejectedValue(new NotFoundException());
    const res = { set: jest.fn(), send: jest.fn() } as unknown as import('express').Response;
    await expect(controller.getCertificate('invalid', res)).rejects.toThrow(NotFoundException);
  });

  it('should propagate ForbiddenException from service', async () => {
    service.generate.mockRejectedValue(new ForbiddenException());
    const res = { set: jest.fn(), send: jest.fn() } as unknown as import('express').Response;
    await expect(controller.getCertificate('abc12345', res)).rejects.toThrow(ForbiddenException);
  });
});
