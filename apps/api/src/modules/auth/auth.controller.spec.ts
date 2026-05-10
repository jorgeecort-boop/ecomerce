import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<Pick<AuthService, 'register' | 'login' | 'refreshToken'>>;

  beforeEach(() => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      refreshToken: jest.fn(),
    };

    controller = new AuthController(authService as unknown as AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should validate authenticated request user', () => {
    const req = {
      user: {
        id: 'user_1',
        email: 'vendor@example.com',
        name: 'Vendor',
      },
    };

    const result = controller.validate(req);

    expect(result).toEqual({
      valid: true,
      user: {
        id: 'user_1',
        email: 'vendor@example.com',
        name: 'Vendor',
      },
    });
  });
});
