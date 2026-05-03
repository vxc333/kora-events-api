import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User, UserPlan, UserRole } from './user.entity';

const mockUser: User = {
  id: 'uuid-1',
  name: 'Maria',
  email: 'maria@example.com',
  password: 'hashed',
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

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            updateProfile: jest.fn().mockResolvedValue(mockUser),
            updateAvatar: jest.fn().mockResolvedValue({ ...mockUser, avatarUrl: '/uploads/avatars/x.jpg' }),
            changePassword: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
  });

  it('getProfile should return current user', () => {
    expect(controller.getProfile(mockUser)).toEqual(mockUser);
  });

  it('updateProfile should call usersService.updateProfile with userId', async () => {
    const dto = { name: 'Nova Maria' };
    const result = await controller.updateProfile(mockUser, dto);
    expect(usersService.updateProfile).toHaveBeenCalledWith('uuid-1', dto);
    expect(result).toEqual(mockUser);
  });

  it('changePassword should call usersService.changePassword and return message', async () => {
    const result = await controller.changePassword(mockUser, {
      currentPassword: 'old',
      newPassword: 'new12345',
    });
    expect(usersService.changePassword).toHaveBeenCalledWith('uuid-1', 'old', 'new12345');
    expect(result).toHaveProperty('message');
  });
});
