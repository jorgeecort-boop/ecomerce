import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { TestSeedService } from './test-seed.service';
import { PrismaService } from '../../config/prisma.service';

describe('TestSeedService', () => {
  let service: TestSeedService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestSeedService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TestSeedService>(TestSeedService);
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    const dto = { email: 'vendor-test@ecomerce.com', password: 'VendorTest123!', name: 'Vendor' };

    it('returns existing user (created=false) when email already in DB', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'usr_1', email: dto.email });

      const res = await service.createUser(dto);

      expect(res).toEqual({ id: 'usr_1', email: dto.email, created: false });
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('creates new user with bcrypt-hashed password (created=true)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'usr_new', ...data }),
      );

      const res = await service.createUser(dto);

      expect(res).toEqual({ id: 'usr_new', email: dto.email, created: true });
      expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);

      const createdData = mockPrisma.user.create.mock.calls[0][0].data;
      // Hash must NOT be the literal password
      expect(createdData.password).not.toBe(dto.password);
      // Must be a real bcrypt hash that verifies against the original password
      const matches = await bcrypt.compare(dto.password, createdData.password);
      expect(matches).toBe(true);
    });

    it('passes through name when provided', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'usr_x', ...data }),
      );

      await service.createUser({ ...dto, name: 'María' });

      expect(mockPrisma.user.create.mock.calls[0][0].data.name).toBe('María');
    });

    it('stores name as null when not provided', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'usr_y', ...data }),
      );

      await service.createUser({ email: dto.email, password: dto.password });

      expect(mockPrisma.user.create.mock.calls[0][0].data.name).toBeNull();
    });

    it('is idempotent across repeated calls with same email', async () => {
      const stored = { id: 'usr_z', email: dto.email };
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // first call: not found → create
        .mockResolvedValueOnce(stored); // second call: found → return existing
      mockPrisma.user.create.mockResolvedValue(stored);

      const first = await service.createUser(dto);
      const second = await service.createUser(dto);

      expect(first.created).toBe(true);
      expect(second.created).toBe(false);
      expect(first.id).toBe(second.id);
      expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
    });
  });
});
