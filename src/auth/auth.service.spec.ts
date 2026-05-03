import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { User, UserPlan, UserRole } from '../users/user.entity';

const mockUser: User = {
  id: 'uuid-1',
  name: 'Maria',
  email: 'maria@example.com',
  password: '',
  phone: null,
  avatarUrl: null,
  role: UserRole.ORGANIZER,
  isEmailVerified: false,
  refreshToken: null,
  passwordResetToken: null,
  passwordResetExpires: null,
  plan: UserPlan.FREE,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let mailService: jest.Mocked<MailService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findByEmail: jest.fn(),
            findById: jest.fn(),
            updateRefreshToken: jest.fn(),
            setPasswordResetToken: jest.fn(),
            findByPasswordResetToken: jest.fn(),
            resetPassword: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, string> = {
                JWT_SECRET: 'secret',
                JWT_EXPIRES_IN: '7d',
                JWT_REFRESH_SECRET: 'refresh-secret',
                JWT_REFRESH_EXPIRES_IN: '30d',
              };
              return map[key];
            }),
          },
        },
        {
          provide: MailService,
          useValue: { sendPasswordReset: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    mailService = module.get(MailService);
  });

  describe('validateUser', () => {
    it('should return null when user not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      expect(await service.validateUser('x@x.com', 'pass')).toBeNull();
    });

    it('should return null when password is wrong', async () => {
      const hashed = await bcrypt.hash('correct', 10);
      usersService.findByEmail.mockResolvedValue({ ...mockUser, password: hashed });
      expect(await service.validateUser('maria@example.com', 'wrong')).toBeNull();
    });

    it('should return user when credentials are correct', async () => {
      const hashed = await bcrypt.hash('correct', 10);
      usersService.findByEmail.mockResolvedValue({ ...mockUser, password: hashed });
      const result = await service.validateUser('maria@example.com', 'correct');
      expect(result?.id).toBe('uuid-1');
    });
  });

  describe('login', () => {
    it('should return access_token and refresh_token', async () => {
      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      usersService.updateRefreshToken.mockResolvedValue(undefined);
      const result = await service.login(mockUser);
      expect(result).toEqual({ access_token: 'access-token', refresh_token: 'refresh-token' });
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith('uuid-1', 'refresh-token');
    });
  });

  describe('refreshTokens', () => {
    it('should throw UnauthorizedException when user not found', async () => {
      usersService.findById.mockResolvedValue(null);
      await expect(service.refreshTokens('uuid-1', 'token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when refresh token does not match', async () => {
      const hashed = await bcrypt.hash('stored-token', 10);
      usersService.findById.mockResolvedValue({ ...mockUser, refreshToken: hashed });
      await expect(service.refreshTokens('uuid-1', 'wrong-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should return new tokens when refresh token matches', async () => {
      const raw = 'correct-token';
      const hashed = await bcrypt.hash(raw, 10);
      usersService.findById.mockResolvedValue({ ...mockUser, refreshToken: hashed });
      jwtService.sign
        .mockReturnValueOnce('new-access')
        .mockReturnValueOnce('new-refresh');
      usersService.updateRefreshToken.mockResolvedValue(undefined);
      const result = await service.refreshTokens('uuid-1', raw);
      expect(result).toEqual({ access_token: 'new-access', refresh_token: 'new-refresh' });
    });
  });

  describe('forgotPassword', () => {
    it('should silently succeed even when email not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      await expect(service.forgotPassword('nobody@example.com')).resolves.not.toThrow();
      expect(mailService.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('should send reset email when user exists', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      usersService.setPasswordResetToken.mockResolvedValue(undefined);
      mailService.sendPasswordReset.mockResolvedValue(undefined);
      await service.forgotPassword('maria@example.com');
      expect(mailService.sendPasswordReset).toHaveBeenCalled();
    });
  });
});
