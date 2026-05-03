import { Test, TestingModule } from '@nestjs/testing';
import { CertificateSignersController } from './certificate-signers.controller';
import { CertificateSignersService } from './certificate-signers.service';
import { CertificateSigner } from './certificate-signer.entity';

const mockSigner: CertificateSigner = {
  id: 'sgn-uuid-1',
  eventId: 'evt-uuid-1',
  event: {} as never,
  name: 'Prof. Dr. João Silva',
  title: 'Coordenador',
  signatureUrl: null,
  displayOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('CertificateSignersController', () => {
  let controller: CertificateSignersController;
  let service: jest.Mocked<CertificateSignersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CertificateSignersController],
      providers: [
        {
          provide: CertificateSignersService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockSigner),
            findByEvent: jest.fn().mockResolvedValue([mockSigner]),
            update: jest.fn().mockResolvedValue({ ...mockSigner, title: 'Diretor' }),
            updateSignature: jest.fn().mockResolvedValue({ ...mockSigner, signatureUrl: '/uploads/signatures/sig.png' }),
            remove: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<CertificateSignersController>(CertificateSignersController);
    service = module.get(CertificateSignersService);
  });

  it('create should delegate to service', async () => {
    const user = { id: 'org-uuid-1' } as never;
    const dto = { name: 'Prof. Dr. João Silva', title: 'Coordenador' };
    const result = await controller.create('evt-uuid-1', user, dto);
    expect(service.create).toHaveBeenCalledWith('evt-uuid-1', 'org-uuid-1', dto);
    expect(result).toEqual(mockSigner);
  });

  it('findByEvent should return signer list', async () => {
    const user = { id: 'org-uuid-1' } as never;
    const result = await controller.findByEvent('evt-uuid-1', user);
    expect(service.findByEvent).toHaveBeenCalledWith('evt-uuid-1', 'org-uuid-1');
    expect(result).toEqual([mockSigner]);
  });

  it('update should delegate with signerId', async () => {
    const user = { id: 'org-uuid-1' } as never;
    const result = await controller.update('evt-uuid-1', 'sgn-uuid-1', user, { title: 'Diretor' });
    expect(service.update).toHaveBeenCalledWith('evt-uuid-1', 'sgn-uuid-1', 'org-uuid-1', { title: 'Diretor' });
    expect(result.title).toBe('Diretor');
  });

  it('uploadSignature should call updateSignature and return url', async () => {
    const user = { id: 'org-uuid-1' } as never;
    const file = { filename: 'sig.png' } as Express.Multer.File;
    const result = await controller.uploadSignature('evt-uuid-1', 'sgn-uuid-1', user, file);
    expect(service.updateSignature).toHaveBeenCalledWith('evt-uuid-1', 'sgn-uuid-1', 'org-uuid-1', '/uploads/signatures/sig.png');
    expect(result.signatureUrl).toBe('/uploads/signatures/sig.png');
  });

  it('remove should call service and return 204', async () => {
    const user = { id: 'org-uuid-1' } as never;
    await controller.remove('evt-uuid-1', 'sgn-uuid-1', user);
    expect(service.remove).toHaveBeenCalledWith('evt-uuid-1', 'sgn-uuid-1', 'org-uuid-1');
  });
});
