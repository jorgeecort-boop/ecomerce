import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksController } from './webhooks.controller';

describe('WebhooksController', () => {
  let controller: WebhooksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleVercelForms', () => {
    it('should handle contact.created event', async () => {
      const body = { type: 'contacto.creado', data: { email: 'test@test.com', name: 'Test' } };

      const result = await controller.handleVercelForms(body, {} as any);

      expect(result).toEqual({ received: true, event: 'contacto.creado' });
    });

    it('should handle contact.created event', async () => {
      const body = { type: 'contact.created', data: { email: 'test@test.com' } };

      const result = await controller.handleVercelForms(body, {} as any);

      expect(result).toEqual({ received: true, event: 'contact.created' });
    });

    it('should handle form.submitted event', async () => {
      const body = { type: 'form.submitted', data: { formName: 'Newsletter' } };

      const result = await controller.handleVercelForms(body, {} as any);

      expect(result).toEqual({ received: true, event: 'form.submitted' });
    });

    it('should handle form with event field instead of type', async () => {
      const body = { event: 'formulario.enviado', data: { formId: '123' } };

      const result = await controller.handleVercelForms(body, {} as any);

      expect(result).toEqual({ received: true, event: 'formulario.enviado' });
    });

    it('should handle unknown event types gracefully', async () => {
      const body = { type: 'unknown.event' };

      const result = await controller.handleVercelForms(body, {} as any);

      expect(result).toEqual({ received: true, event: 'unknown.event' });
    });

    it('should handle body without type or event', async () => {
      const body = { someField: 'value' };

      const result = await controller.handleVercelForms(body, {} as any);

      expect(result).toEqual({ received: true, event: 'unknown' });
    });
  });

  describe('handleContact', () => {
    it('should handle contact form submission', async () => {
      const body = { name: 'Test User', email: 'test@test.com', message: 'Hello' };

      const result = await controller.handleContact(body);

      expect(result).toEqual({
        received: true,
        message: 'Contacto recibido correctamente',
      });
    });

    it('should handle empty contact form', async () => {
      const result = await controller.handleContact({});

      expect(result).toEqual({
        received: true,
        message: 'Contacto recibido correctamente',
      });
    });
  });
});
