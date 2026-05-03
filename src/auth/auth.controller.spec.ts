import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockTokens = { access_token: 'at', refresh_token: 'rt' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn().mockResolvedValue(mockTokens),
            login: jest.fn().mockResolvedValue(mockTokens),
            refreshTokens: jest.fn().mockResolvedValue(mockTokens),
            forgotPassword: jest.fn().mockResolvedValue(undefined),
            resetPassword: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn().mockReturnValue({ sub: 'uuid-1' }),
            decode: jest.fn().mockReturnValue({ sub: 'uuid-1' }),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('register should call authService.register and return tokens', async () => {
    const dto = { name: 'Maria', email: 'a@b.com', password: 'pass1234' };
    expect(await controller.register(dto)).toEqual(mockTokens);
    expect(authService.register).toHaveBeenCalledWith(dto);
  });

  it('login should call authService.login with req.user', async () => {
    const mockUser = { id: '1', email: 'a@b.com' } as never;
    expect(await controller.login({ user: mockUser } as never)).toEqual(mockTokens);
    expect(authService.login).toHaveBeenCalledWith(mockUser);
  });

  it('refresh should call authService.refreshTokens with userId from token', async () => {
    const result = await controller.refresh({ refresh_token: 'header.eyJzdWIiOiJ1dWlkLTEifQ.sig' });
    expect(result).toEqual(mockTokens);
  });

  it('forgotPassword should return success message regardless', async () => {
    const result = await controller.forgotPassword({ email: 'a@b.com' });
    expect(result).toHaveProperty('message');
  });

  it('resetPassword should call authService.resetPassword', async () => {
    const result = await controller.resetPassword({ token: 'tok', newPassword: 'newpass12' });
    expect(authService.resetPassword).toHaveBeenCalledWith('tok', 'newpass12');
    expect(result).toHaveProperty('message');
  });
});
