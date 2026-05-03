import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersService } from './users.service';
import { User, UserPlan, UserRole } from './user.entity';

const mockUser: User = {
  id: 'uuid-1',
  name: 'Maria Silva',
  email: 'maria@example.com',
  password: '$2a$10$hashedpassword',
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

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repo = module.get(getRepositoryToken(User));
  });

  describe('create', () => {
    it('should throw ConflictException when email already exists', async () => {
      repo.findOne.mockResolvedValue(mockUser);
      await expect(
        service.create({ name: 'X', email: mockUser.email, password: 'pass1234' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should hash password and save new user', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue({ ...mockUser, id: 'new-id' });
      repo.save.mockResolvedValue({ ...mockUser, id: 'new-id' });
      const result = await service.create({ name: 'Maria', email: 'new@example.com', password: 'pass1234' });
      expect(repo.save).toHaveBeenCalled();
      expect(result.id).toBe('new-id');
    });
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      repo.findOne.mockResolvedValue(mockUser);
      expect(await service.findByEmail('maria@example.com')).toEqual(mockUser);
    });

    it('should return null when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      expect(await service.findByEmail('nobody@example.com')).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      repo.findOne.mockResolvedValue(mockUser);
      expect(await service.findById('uuid-1')).toEqual(mockUser);
    });

    it('should return null when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      expect(await service.findById('missing')).toBeNull();
    });
  });

  describe('updateRefreshToken', () => {
    it('should save hashed refresh token', async () => {
      repo.findOne.mockResolvedValue(mockUser);
      repo.save.mockResolvedValue(mockUser);
      await service.updateRefreshToken('uuid-1', 'raw-token');
      expect(repo.save).toHaveBeenCalled();
      const saved = repo.save.mock.calls[0][0] as User;
      const isHashed = await bcrypt.compare('raw-token', saved.refreshToken!);
      expect(isHashed).toBe(true);
    });

    it('should set refreshToken to null when token is null', async () => {
      repo.findOne.mockResolvedValue(mockUser);
      repo.save.mockResolvedValue({ ...mockUser, refreshToken: null });
      await service.updateRefreshToken('uuid-1', null);
      const saved = repo.save.mock.calls[0][0] as User;
      expect(saved.refreshToken).toBeNull();
    });
  });

  describe('changePassword', () => {
    it('should throw NotFoundException when user not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.changePassword('uuid-1', 'old', 'new12345')).rejects.toThrow(NotFoundException);
    });

    it('should update password when old password is correct', async () => {
      const hashed = await bcrypt.hash('correctpass', 10);
      repo.findOne.mockResolvedValue({ ...mockUser, password: hashed });
      repo.save.mockResolvedValue(mockUser);
      await service.changePassword('uuid-1', 'correctpass', 'newpass123');
      expect(repo.save).toHaveBeenCalled();
    });
  });
});
