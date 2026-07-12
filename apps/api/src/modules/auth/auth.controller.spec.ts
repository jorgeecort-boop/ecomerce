import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<Pick<AuthService, 'register' | 'login' | 'refreshToken' | 'validateToken'>>;

  beforeEach(() => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      refreshToken: jest.fn(),
      validateToken: jest.fn().mockResolvedValue({ id: 'user_1', email: 'vendor@example.com', name: 'Vendor' }),
    };

    controller = new AuthController(authService as unknown as AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should validate authenticated request user', async () => {
    const req = {
      user: {
        id: 'user_1',
        email: 'vendor@example.com',
        name: 'Vendor',
      },
    };

    const result = await controller.validate(req);

    expect(result).toEqual({ id: 'user_1', email: 'vendor@example.com', name: 'Vendor' });
    expect(authService.validateToken).toHaveBeenCalledWith('user_1');
  });
});
