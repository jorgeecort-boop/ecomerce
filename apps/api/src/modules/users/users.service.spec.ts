import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../../config/prisma.service';

type PrismaMock = {
  user: {
    create: jest.MockedFunction<any>;
    findUnique: jest.MockedFunction<any>;
    update: jest.MockedFunction<any>;
  };
};

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    const prismaMock: PrismaMock = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get(PrismaService) as unknown as PrismaMock;
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a user', async () => {
      const dto = { email: 'test@test.com', password: 'hashed-password', name: 'Test' };
      const expected = { id: 'uuid-1', ...dto, isActive: true, createdAt: new Date(), updatedAt: new Date() };
      prisma.user.create.mockResolvedValue(expected);

      const result = await service.create(dto);

      expect(result).toEqual(expected);
      expect(prisma.user.create).toHaveBeenCalledWith({ data: dto });
    });

    it('should create user without optional name', async () => {
      const dto = { email: 'test@test.com', password: 'hashed-password' };
      const expected = { id: 'uuid-2', ...dto, name: null, isActive: true, createdAt: new Date(), updatedAt: new Date() };
      prisma.user.create.mockResolvedValue(expected);

      const result = await service.create(dto);

      expect(result).toEqual(expected);
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const expected = { id: 'uuid-1', email: 'test@test.com', password: 'hash', name: 'Test', isActive: true, createdAt: new Date(), updatedAt: new Date() };
      prisma.user.findUnique.mockResolvedValue(expected);

      const result = await service.findByEmail('test@test.com');

      expect(result).toEqual(expected);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@test.com' } });
    });

    it('should return null when email not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('notfound@test.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by id with stores', async () => {
      const expected = {
        id: 'uuid-1',
        email: 'test@test.com',
        password: 'hash',
        name: 'Test',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        stores: [{ id: 'store-1', name: 'My Store', slug: 'my-store', isActive: true }],
      };
      prisma.user.findUnique.mockResolvedValue(expected);

      const result = await service.findById('uuid-1');

      expect(result).toEqual(expected);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        include: {
          stores: {
            select: { id: true, name: true, slug: true, isActive: true },
          },
        },
      });
    });

    it('should return null when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user name', async () => {
      const existingUser = { id: 'uuid-1', email: 'test@test.com', password: 'hash', name: 'Old Name', isActive: true, createdAt: new Date(), updatedAt: new Date() };
      const updatedUser = { ...existingUser, name: 'New Name' };
      prisma.user.findUnique.mockResolvedValue(existingUser);
      prisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.update('uuid-1', { name: 'New Name' });

      expect(result).toEqual(updatedUser);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        data: { name: 'New Name' },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.update('non-existent', { name: 'Test' })).rejects.toThrow(NotFoundException);
    });
  });
});
