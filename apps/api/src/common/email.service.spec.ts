import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;

  const buildModule = async (apiKey: string, from = 'Tienda <test@resend.dev>') => {
    const mockConfig = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'RESEND_API_KEY') return apiKey;
        if (key === 'EMAIL_FROM') return from;
        return defaultValue ?? '';
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    return module.get<EmailService>(EmailService);
  };

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should be disabled when RESEND_API_KEY is not set', async () => {
      service = await buildModule('');
      const result = await service.send({ to: 'a@b.com', subject: 'Test', html: '<p>hi</p>' });
      expect(result).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should be enabled when RESEND_API_KEY is set', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      service = await buildModule('re_test_key');
      const result = await service.send({ to: 'a@b.com', subject: 'Test', html: '<p>hi</p>' });
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('send()', () => {
    beforeEach(async () => {
      service = await buildModule('re_test_key');
    });

    it('should call Resend API with correct headers and body', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      await service.send({ to: 'cliente@example.com', subject: 'Confirmación', html: '<b>OK</b>' });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer re_test_key',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            from: 'Tienda <test@resend.dev>',
            to: 'cliente@example.com',
            subject: 'Confirmación',
            html: '<b>OK</b>',
          }),
        })
      );
    });

    it('should return false when Resend responds with non-OK status', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 422,
        text: jest.fn().mockResolvedValue('{"message":"Invalid email"}'),
      });

      const result = await service.send({ to: 'bad', subject: 'Test', html: '<p/>' });
      expect(result).toBe(false);
    });

    it('should return false and not throw when fetch throws a network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network failure'));

      const result = await service.send({ to: 'a@b.com', subject: 'Test', html: '<p/>' });
      expect(result).toBe(false);
    });

    it('should return true on success', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      const result = await service.send({ to: 'a@b.com', subject: 'OK', html: '<p>ok</p>' });
      expect(result).toBe(true);
    });
  });

  describe('sendOrderConfirmation()', () => {
    beforeEach(async () => {
      service = await buildModule('re_test_key');
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
    });

    it('should call send() with correct subject and recipient', async () => {
      const sendSpy = jest.spyOn(service, 'send');

      await service.sendOrderConfirmation({
        to: 'cliente@example.com',
        customerName: 'María López',
        orderNumber: 'TIENDA-000042',
        items: [{ title: 'Camiseta', quantity: 2, price: 30000 }],
        total: 60000,
        currency: 'COP',
      });

      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'cliente@example.com',
          subject: 'Pedido confirmado #TIENDA-000042',
        })
      );
    });

    it('should include customer name and order number in the HTML body', async () => {
      const sendSpy = jest.spyOn(service, 'send');

      await service.sendOrderConfirmation({
        to: 'x@x.com',
        customerName: 'Carlos',
        orderNumber: 'SHOP-001',
        items: [{ title: 'Audífonos', quantity: 1, price: 50000 }],
        total: 50000,
        currency: 'COP',
      });

      const html = (sendSpy.mock.calls[0][0] as { html: string }).html;
      expect(html).toContain('Carlos');
      expect(html).toContain('SHOP-001');
      expect(html).toContain('Audífonos');
    });

    it('should format COP currency as locale string without decimals', async () => {
      const sendSpy = jest.spyOn(service, 'send');

      await service.sendOrderConfirmation({
        to: 'x@x.com',
        customerName: 'Test',
        orderNumber: 'X-001',
        items: [{ title: 'Item', quantity: 1, price: 150000 }],
        total: 150000,
        currency: 'COP',
      });

      const html = (sendSpy.mock.calls[0][0] as { html: string }).html;
      expect(html).toContain('COP');
      expect(html).not.toContain('150000.00');
    });

    it('should format non-COP currency with two decimals', async () => {
      const sendSpy = jest.spyOn(service, 'send');

      await service.sendOrderConfirmation({
        to: 'x@x.com',
        customerName: 'Test',
        orderNumber: 'X-002',
        items: [{ title: 'Item', quantity: 1, price: 29.99 }],
        total: 29.99,
        currency: 'USD',
      });

      const html = (sendSpy.mock.calls[0][0] as { html: string }).html;
      expect(html).toContain('29.99');
      expect(html).toContain('USD');
    });

    it('should include shipping address when provided', async () => {
      const sendSpy = jest.spyOn(service, 'send');

      await service.sendOrderConfirmation({
        to: 'x@x.com',
        customerName: 'Test',
        orderNumber: 'X-003',
        items: [{ title: 'Item', quantity: 1, price: 50000 }],
        total: 50000,
        currency: 'COP',
        shippingAddress: { address: 'Calle 10 #20-30', city: 'Medellín', country: 'Colombia' },
      });

      const html = (sendSpy.mock.calls[0][0] as { html: string }).html;
      expect(html).toContain('Calle 10 #20-30');
      expect(html).toContain('Medellín');
      expect(html).toContain('Colombia');
    });

    it('should omit shipping section when address is not provided', async () => {
      const sendSpy = jest.spyOn(service, 'send');

      await service.sendOrderConfirmation({
        to: 'x@x.com',
        customerName: 'Test',
        orderNumber: 'X-004',
        items: [{ title: 'Item', quantity: 1, price: 20000 }],
        total: 20000,
        currency: 'COP',
      });

      const html = (sendSpy.mock.calls[0][0] as { html: string }).html;
      expect(html).not.toContain('Dirección de envío');
    });

    it('should return false when disabled (no API key)', async () => {
      const disabledService = await buildModule('');
      const result = await disabledService.sendOrderConfirmation({
        to: 'x@x.com',
        customerName: 'Test',
        orderNumber: 'X-000',
        items: [],
        total: 0,
        currency: 'COP',
      });
      expect(result).toBe(false);
    });
  });
});
