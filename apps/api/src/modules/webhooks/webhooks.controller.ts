import { Controller, Post, Body, Logger, Req, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { createHmac, timingSafeEqual } from 'crypto';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  /**
   * Vercel Forms Webhook
   * Recibe eventos de formularios de Vercel: contacto.creado, contacto.eliminado, etc.
   */
  @Post('vercel-forms')
  @ApiOperation({ summary: 'Handle Vercel Forms webhook events' })
  async handleVercelForms(@Body() body: any, @Req() req: any) {
    this.logger.log(`Vercel Forms event: ${JSON.stringify(body)}`);

    const eventType = body.type || body.event || 'unknown';
    const eventData = body.data || body;

    // Procesar según tipo de evento
    switch (eventType) {
      case 'contacto.creado':
      case 'contact.created':
        this.logger.log(`Contacto creado: ${eventData.email || eventData.name || 'N/A'}`);
        break;
      case 'contacto.eliminado':
      case 'contact.deleted':
        this.logger.log(`Contacto eliminado: ${eventData.email || eventData.id || 'N/A'}`);
        break;
      case 'form.submitted':
      case 'formulario.enviado':
        this.logger.log(`Formulario enviado: ${eventData.formName || eventData.formId || 'N/A'}`);
        break;
      default:
        this.logger.log(`Evento Vercel recibido: ${eventType}`);
    }

    return { received: true, event: eventType };
  }

  /**
   * Webhook genérico de contacto
   */
  @Post('contact')
  @ApiOperation({ summary: 'Handle contact form submissions' })
  async handleContact(@Body() body: any) {
    this.logger.log(`Contact form: ${JSON.stringify(body)}`);

    return {
      received: true,
      message: 'Contacto recibido correctamente',
    };
  }
}
