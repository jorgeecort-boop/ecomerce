import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TelegramService } from './telegram.service';

describe('TelegramService', () => {
  let service: TelegramService;

  const mockFetch = jest.fn();
  global.fetch = mockFetch;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              TELEGRAM_BOT_TOKEN: 'test-bot-token',
              TELEGRAM_CHAT_ID: 'test-chat-id',
            }),
          ],
        }),
      ],
      providers: [TelegramService],
    }).compile();

    service = module.get<TelegramService>(TelegramService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendMessage', () => {
    it('should send message via Telegram API', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ ok: true }),
      });

      const result = await service.sendMessage('Test message');

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.telegram.org/bottest-bot-token/sendMessage',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            chat_id: 'test-chat-id',
            text: 'Test message',
            parse_mode: 'HTML',
            disable_web_page_preview: true,
          }),
        })
      );
    });

    it('should return false when API call fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        text: jest.fn().mockResolvedValue('Error'),
      });

      const result = await service.sendMessage('Test message');

      expect(result).toBe(false);
    });

    it('should return false when fetch throws', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await service.sendMessage('Test message');

      expect(result).toBe(false);
    });
  });

  describe('notifyNewOrder', () => {
    it('should send formatted order notification', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      await service.notifyNewOrder('ORD-123', 250.5, 'customer@test.com');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('Nueva Orden'),
        })
      );
    });
  });

  describe('notifyPaymentReceived', () => {
    it('should send formatted payment notification', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      await service.notifyPaymentReceived('ORD-123', 250.5, 'mercadopago');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('Pago Recibido'),
        })
      );
    });
  });

  describe('notifyLowStock', () => {
    it('should send formatted low stock notification', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      await service.notifyLowStock('Test Product', 3);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('Stock Bajo'),
        })
      );
    });
  });

  describe('notifySystemError', () => {
    it('should send formatted error notification', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      await service.notifySystemError('Database connection failed');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('Error del Sistema'),
        })
      );
    });
  });

  describe('notifyDeploySuccess', () => {
    it('should send formatted deploy notification', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      await service.notifyDeploySuccess();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('Deploy Exitoso'),
        })
      );
    });
  });
});
