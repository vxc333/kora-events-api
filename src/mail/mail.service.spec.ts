import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { ConfigService } from '@nestjs/config';

describe('MailService', () => {
  let service: MailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, string> = {
                SMTP_HOST: 'smtp.example.com',
                SMTP_PORT: '587',
                SMTP_USER: 'test@example.com',
                SMTP_PASS: 'pass',
                SMTP_FROM: '"Test" <test@example.com>',
                FRONTEND_URL: 'http://localhost:5173',
              };
              return map[key];
            }),
          },
        },
      ],
    }).compile();
    service = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('sendPasswordReset should resolve without throwing', async () => {
    jest.spyOn(service['transporter'], 'sendMail').mockResolvedValue({} as never);
    await expect(
      service.sendPasswordReset('user@example.com', 'João', 'reset-token-abc'),
    ).resolves.not.toThrow();
  });
});
