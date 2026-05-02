import { Test, TestingModule } from '@nestjs/testing';
import { TestSeedController } from './test-seed.controller';
import { TestSeedService } from './test-seed.service';
import { TestSeedGuard } from './test-seed.guard';

describe('TestSeedController', () => {
  let controller: TestSeedController;

  const mockService = {
    createUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TestSeedController],
      providers: [
        { provide: TestSeedService, useValue: mockService },
        { provide: TestSeedGuard, useValue: { canActivate: () => true } },
      ],
    })
      .overrideGuard(TestSeedGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TestSeedController>(TestSeedController);
    jest.clearAllMocks();
  });

  it('delegates createUser to the service and returns its result', async () => {
    const dto = { email: 'a@b.com', password: 'StrongPass1!', name: 'A' };
    mockService.createUser.mockResolvedValue({ id: 'usr_1', email: dto.email, created: true });

    const res = await controller.createUser(dto);

    expect(mockService.createUser).toHaveBeenCalledWith(dto);
    expect(res).toEqual({ id: 'usr_1', email: dto.email, created: true });
  });
});
