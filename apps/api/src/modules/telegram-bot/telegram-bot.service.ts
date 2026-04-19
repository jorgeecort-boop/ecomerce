import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Context } from 'telegraf';
import { PrismaService } from '../../config/prisma.service';
import { SupplierApiService } from '../suppliers/supplier-api.service';

@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramBotService.name);
  private bot: Telegraf | null = null;
  private readonly token: string;
  private readonly allowedChatIds: string[];

  // Estado en memoria para flujos de conversación
  private pendingImport = new Map<
    number,
    { products: SearchResult[]; storeId: string }
  >();

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private supplierApi: SupplierApiService,
  ) {
    this.token = this.config.get<string>('TELEGRAM_BOT_TOKEN', '');
    const raw = this.config.get<string>('TELEGRAM_ALLOWED_CHAT_IDS', '');
    this.allowedChatIds = raw ? raw.split(',').map((s) => s.trim()) : [];
  }

  async onModuleInit() {
    if (!this.token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set — bot disabled');
      return;
    }

    this.bot = new Telegraf(this.token);
    this.bot.catch((err: unknown) => {
      this.logger.error(`Telegram bot error: ${(err as Error).message ?? err}`);
    });
    this.registerCommands();

    // In production use webhooks; polling only in development.
    if (process.env.NODE_ENV === 'production') {
      this.logger.log('Telegram bot commands registered (webhook mode — polling disabled in production)');
      return;
    }

    // Polling mode for local dev. Errors are caught above and logged without crashing.
    this.bot.launch().catch((err: unknown) => {
      this.logger.error(`Bot launch error: ${(err as Error).message ?? err}`);
    });

    this.logger.log('Telegram bot started (polling)');
  }

  async onModuleDestroy() {
    this.bot?.stop('SIGTERM');
  }

  // ─── Guard de autorización ────────────────────────────────────────────────
  private isAuthorized(ctx: Context): boolean {
    if (this.allowedChatIds.length === 0) return true; // sin restricción si no está configurado
    const id = String(ctx.chat?.id ?? '');
    return this.allowedChatIds.includes(id);
  }

  private async guard(ctx: Context, fn: () => Promise<void>) {
    if (!this.isAuthorized(ctx)) {
      await ctx.reply('⛔ No tienes autorización para usar este bot.');
      return;
    }
    try {
      await fn();
    } catch (err: any) {
      this.logger.error(err.message);
      await ctx.reply(`❌ Error: ${err.message}`);
    }
  }

  // ─── Registro de comandos ─────────────────────────────────────────────────
  private registerCommands() {
    if (!this.bot) return;

    this.bot.start((ctx) =>
      this.guard(ctx, async () => {
        await ctx.reply(
          `👋 *Bot de Inventario y Productos*\n\n` +
            `Comandos disponibles:\n\n` +
            `🔍 /buscar <término> — Busca en CJ/AliExpress\n` +
            `➕ /agregar <id> <storeId> — Importa un producto a tu tienda\n` +
            `📦 /inventario <storeId> — Lista todos los productos\n` +
            `⚠️ /stock_bajo <storeId> — Productos con stock < 5\n` +
            `💲 /precio <productId> <nuevo_precio> — Actualiza precio\n` +
            `🛒 /ordenes <storeId> — Órdenes del día\n` +
            `📊 /stats <storeId> — Resumen de la tienda\n` +
            `🏪 /tiendas — Lista tus tiendas`,
          { parse_mode: 'Markdown' },
        );
      }),
    );

    this.bot.help((ctx) => ctx.reply('Usa /start para ver todos los comandos disponibles.'));

    this.bot.command('tiendas', (ctx) => this.guard(ctx, () => this.cmdTiendas(ctx)));
    this.bot.command('buscar', (ctx) => this.guard(ctx, () => this.cmdBuscar(ctx)));
    this.bot.command('agregar', (ctx) => this.guard(ctx, () => this.cmdAgregar(ctx)));
    this.bot.command('inventario', (ctx) => this.guard(ctx, () => this.cmdInventario(ctx)));
    this.bot.command('stock_bajo', (ctx) => this.guard(ctx, () => this.cmdStockBajo(ctx)));
    this.bot.command('precio', (ctx) => this.guard(ctx, () => this.cmdPrecio(ctx)));
    this.bot.command('ordenes', (ctx) => this.guard(ctx, () => this.cmdOrdenes(ctx)));
    this.bot.command('stats', (ctx) => this.guard(ctx, () => this.cmdStats(ctx)));

    // Callback de botones inline (para confirmar importación)
    this.bot.action(/^import:(.+):(.+)$/, (ctx) =>
      this.guard(ctx, () => this.handleImportCallback(ctx)),
    );
  }

  // ─── /tiendas ─────────────────────────────────────────────────────────────
  private async cmdTiendas(ctx: Context) {
    const stores = await this.prisma.store.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });

    if (!stores.length) {
      await ctx.reply('No hay tiendas registradas.');
      return;
    }

    const lines = stores.map(
      (s) => `🏪 *${s.name}*\nID: \`${s.id}\`\nProductos: ${(s as any)._count.products}`,
    );
    await ctx.reply(`*Tus tiendas:*\n\n${lines.join('\n\n')}`, { parse_mode: 'Markdown' });
  }

  // ─── /buscar <término> ────────────────────────────────────────────────────
  private async cmdBuscar(ctx: Context) {
    const text = (ctx.message as any)?.text ?? '';
    const query = text.replace('/buscar', '').trim();

    if (!query) {
      await ctx.reply('Uso: /buscar <término>\nEjemplo: /buscar auriculares bluetooth');
      return;
    }

    await ctx.reply(`🔍 Buscando *${query}* en proveedores...`, { parse_mode: 'Markdown' });

    const results = await this.searchSupplierProducts(query);

    if (!results.length) {
      await ctx.reply('No se encontraron productos para esa búsqueda.');
      return;
    }

    // Guardar resultados temporalmente para importación
    const chatId = ctx.chat!.id;
    this.pendingImport.set(chatId, { products: results, storeId: '' });

    const lines = results.map(
      (p, i) =>
        `*${i + 1}. ${p.title}*\n` +
        `💰 Costo: $${p.costPrice.toFixed(2)} | Venta sugerida: $${(p.costPrice * 2.5).toFixed(2)}\n` +
        `📦 Stock: ${p.stock ?? '?'} | ID: \`${p.externalId}\``,
    );

    await ctx.reply(
      `*Resultados para "${query}":*\n\n${lines.join('\n\n')}\n\n` +
        `Para importar: /agregar <externalId> <storeId>`,
      { parse_mode: 'Markdown' },
    );
  }

  // ─── /agregar <externalId> <storeId> ─────────────────────────────────────
  private async cmdAgregar(ctx: Context) {
    const text = (ctx.message as any)?.text ?? '';
    const parts = text.replace('/agregar', '').trim().split(/\s+/);

    if (parts.length < 2) {
      await ctx.reply(
        'Uso: /agregar <externalId> <storeId>\n' +
          'Usa /buscar para obtener IDs y /tiendas para el storeId',
      );
      return;
    }

    const [externalId, storeId] = parts;

    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      await ctx.reply(`❌ Tienda \`${storeId}\` no encontrada.\nUsa /tiendas para ver tus tiendas.`, {
        parse_mode: 'Markdown',
      });
      return;
    }

    await ctx.reply(`⏳ Buscando producto en CJ Dropshipping...`);

    // 1. Buscar en DB cache
    let supplierProduct = await this.prisma.supplierProduct.findFirst({
      where: { externalId },
      include: { supplier: true },
    });

    // 2. Si no está en DB, buscar en CJ API y guardar
    if (!supplierProduct) {
      try {
        const apiProduct = await this.supplierApi.getProductDetails('cjdropshipping', externalId);
        if (apiProduct) {
          const supplier = await this.prisma.supplier.findFirst({
            where: { code: 'cjdropshipping' },
          });
          if (supplier) {
            supplierProduct = await this.prisma.supplierProduct.create({
              data: {
                supplierId: supplier.id,
                externalId: apiProduct.externalId,
                title: apiProduct.title,
                description: apiProduct.description ?? '',
                price: apiProduct.price,
                costPrice: apiProduct.costPrice,
                images: apiProduct.images,
                shippingCost: apiProduct.shippingCost,
                shippingTime: apiProduct.shippingTime,
                stock: apiProduct.stock,
                variants: apiProduct.variants ?? undefined,
                lastSyncedAt: new Date(),
              },
              include: { supplier: true },
            });
          }
        }
      } catch (err: any) {
        this.logger.warn(`CJ API fetch failed for ${externalId}: ${err.message}`);
      }
    }

    if (!supplierProduct) {
      await ctx.reply(
        `❌ Producto \`${externalId}\` no encontrado en CJ.\nVerifica el ID con /buscar <término>.`,
        { parse_mode: 'Markdown' },
      );
      return;
    }

    // Verificar si ya existe en la tienda
    const existing = await this.prisma.product.findFirst({
      where: { storeId, sku: externalId },
    });

    if (existing) {
      await ctx.reply(
        `ℹ️ El producto *${existing.title}* ya está en la tienda *${store.name}*.`,
        { parse_mode: 'Markdown' },
      );
      return;
    }

    const sellingPrice = Number(supplierProduct.costPrice) * 2.5;

    // Crear producto en la tienda
    const product = await this.prisma.product.create({
      data: {
        storeId,
        title: supplierProduct.title,
        description: supplierProduct.description ?? '',
        price: sellingPrice,
        costPrice: Number(supplierProduct.costPrice),
        images: supplierProduct.images as string[],
        inventory: supplierProduct.stock ?? 100,
        trackInventory: true,
        sku: externalId,
        isPublished: false,
      },
    });

    // Mapear proveedor → producto
    await this.prisma.supplierProduct.update({
      where: { id: supplierProduct.id },
      data: { ourProductId: product.id, isMapped: true },
    });

    await ctx.reply(
      `✅ *Producto importado con éxito*\n\n` +
        `📦 *${product.title}*\n` +
        `🏪 Tienda: ${store.name}\n` +
        `💰 Precio venta: $${sellingPrice.toFixed(2)}\n` +
        `📦 Stock: ${product.inventory}\n` +
        `⚠️ Estado: No publicado (actívalo desde el dashboard)\n\n` +
        `ID producto: \`${product.id}\``,
      { parse_mode: 'Markdown' },
    );
  }

  // ─── /inventario <storeId> ────────────────────────────────────────────────
  private async cmdInventario(ctx: Context) {
    const text = (ctx.message as any)?.text ?? '';
    const storeId = text.replace('/inventario', '').trim();

    if (!storeId) {
      await ctx.reply('Uso: /inventario <storeId>\nUsa /tiendas para ver tus tiendas.');
      return;
    }

    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      await ctx.reply('❌ Tienda no encontrada.');
      return;
    }

    const products = await this.prisma.product.findMany({
      where: { storeId },
      select: { id: true, title: true, inventory: true, isPublished: true, price: true },
      orderBy: { inventory: 'asc' },
    });

    if (!products.length) {
      await ctx.reply(`La tienda *${store.name}* no tiene productos.\nUsa /buscar para importar.`, {
        parse_mode: 'Markdown',
      });
      return;
    }

    const lines = products.map(
      (p) =>
        `${p.isPublished ? '🟢' : '🔴'} *${p.title}*\n` +
        `   Stock: ${p.inventory ?? '∞'} | Precio: $${Number(p.price).toFixed(2)}`,
    );

    const chunks = this.chunkArray(lines, 10);
    for (const chunk of chunks) {
      await ctx.reply(
        `*Inventario — ${store.name}*\n\n${chunk.join('\n\n')}\n\n🟢 Publicado | 🔴 No publicado`,
        { parse_mode: 'Markdown' },
      );
    }
  }

  // ─── /stock_bajo <storeId> ────────────────────────────────────────────────
  private async cmdStockBajo(ctx: Context) {
    const text = (ctx.message as any)?.text ?? '';
    const storeId = text.replace('/stock_bajo', '').trim();

    if (!storeId) {
      await ctx.reply('Uso: /stock_bajo <storeId>');
      return;
    }

    const products = await this.prisma.product.findMany({
      where: { storeId, trackInventory: true, inventory: { lte: 5 } },
      select: { id: true, title: true, inventory: true },
      orderBy: { inventory: 'asc' },
    });

    if (!products.length) {
      await ctx.reply('✅ No hay productos con stock bajo (≤ 5 unidades).');
      return;
    }

    const lines = products.map(
      (p) => `⚠️ *${p.title}*\n   Stock restante: *${p.inventory}*\n   ID: \`${p.id}\``,
    );

    await ctx.reply(
      `*Alerta de Stock Bajo*\n\n${lines.join('\n\n')}\n\nUsa /precio para actualizar precios.`,
      { parse_mode: 'Markdown' },
    );
  }

  // ─── /precio <productId> <precio> ────────────────────────────────────────
  private async cmdPrecio(ctx: Context) {
    const text = (ctx.message as any)?.text ?? '';
    const parts = text.replace('/precio', '').trim().split(/\s+/);

    if (parts.length < 2) {
      await ctx.reply('Uso: /precio <productId> <nuevo_precio>\nEjemplo: /precio abc123 39.99');
      return;
    }

    const [productId, rawPrice] = parts;
    const newPrice = parseFloat(rawPrice);

    if (isNaN(newPrice) || newPrice <= 0) {
      await ctx.reply('❌ Precio inválido. Debe ser un número positivo.');
      return;
    }

    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      await ctx.reply(`❌ Producto \`${productId}\` no encontrado.`, { parse_mode: 'Markdown' });
      return;
    }

    const oldPrice = Number(product.price);
    await this.prisma.product.update({
      where: { id: productId },
      data: { price: newPrice },
    });

    await ctx.reply(
      `✅ *Precio actualizado*\n\n` +
        `📦 ${product.title}\n` +
        `Precio anterior: $${oldPrice.toFixed(2)}\n` +
        `Nuevo precio: *$${newPrice.toFixed(2)}*`,
      { parse_mode: 'Markdown' },
    );
  }

  // ─── /ordenes <storeId> ───────────────────────────────────────────────────
  private async cmdOrdenes(ctx: Context) {
    const text = (ctx.message as any)?.text ?? '';
    const storeId = text.replace('/ordenes', '').trim();

    if (!storeId) {
      await ctx.reply('Uso: /ordenes <storeId>');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orders = await this.prisma.order.findMany({
      where: { storeId, createdAt: { gte: today } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    if (!orders.length) {
      await ctx.reply('📭 No hay órdenes hoy.');
      return;
    }

    const total = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const lines = orders.map(
      (o) =>
        `🛒 *${(o as any).orderNumber ?? o.id.slice(0, 8)}*\n` +
        `   ${(o as any).customerEmail ?? 'Cliente'} — $${Number(o.total).toFixed(2)}\n` +
        `   Estado: ${o.paymentStatus}`,
    );

    await ctx.reply(
      `*Órdenes de hoy*\n\n${lines.join('\n\n')}\n\n` +
        `📊 Total: *$${total.toFixed(2)}* (${orders.length} órdenes)`,
      { parse_mode: 'Markdown' },
    );
  }

  // ─── /stats <storeId> ────────────────────────────────────────────────────
  private async cmdStats(ctx: Context) {
    const text = (ctx.message as any)?.text ?? '';
    const storeId = text.replace('/stats', '').trim();

    if (!storeId) {
      await ctx.reply('Uso: /stats <storeId>');
      return;
    }

    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      await ctx.reply('❌ Tienda no encontrada.');
      return;
    }

    const [totalProducts, publishedProducts, totalOrders, revenue] = await Promise.all([
      this.prisma.product.count({ where: { storeId } }),
      this.prisma.product.count({ where: { storeId, isPublished: true } }),
      this.prisma.order.count({ where: { storeId } }),
      this.prisma.order.aggregate({
        where: { storeId, paymentStatus: 'PAID' },
        _sum: { total: true },
      }),
    ]);

    const totalRevenue = Number(revenue._sum.total ?? 0);

    await ctx.reply(
      `📊 *Stats — ${store.name}*\n\n` +
        `📦 Productos: ${publishedProducts} publicados / ${totalProducts} total\n` +
        `🛒 Órdenes totales: ${totalOrders}\n` +
        `💰 Ingresos totales: *$${totalRevenue.toFixed(2)}*`,
      { parse_mode: 'Markdown' },
    );
  }

  // ─── Callback de importación inline ──────────────────────────────────────
  private async handleImportCallback(ctx: any) {
    const [, externalId, storeId] = ctx.match;
    const fakeText = `/agregar ${externalId} ${storeId}`;
    (ctx.message as any) = { text: fakeText };
    await this.cmdAgregar(ctx);
    await ctx.answerCbQuery();
  }

  // ─── Búsqueda en CJ API real ──────────────────────────────────────────────
  private async searchSupplierProducts(query: string): Promise<SearchResult[]> {
    try {
      const result = await this.supplierApi.searchProducts('cjdropshipping', query, 1, 5);
      if (result.products.length > 0) {
        return result.products.map((p) => ({
          externalId: p.externalId,
          title: p.title,
          costPrice: p.costPrice,
          stock: p.stock,
          supplierName: 'CJ Dropshipping',
        }));
      }
    } catch (err: any) {
      this.logger.warn(`CJ API search failed, falling back to DB: ${err.message}`);
    }

    // Fallback: buscar en DB cache
    const results = await this.prisma.supplierProduct.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 5,
      orderBy: { lastSyncedAt: 'desc' },
      include: { supplier: { select: { name: true, code: true } } },
    });

    return results.map((p) => ({
      externalId: p.externalId,
      title: p.title,
      costPrice: Number(p.costPrice),
      stock: p.stock ?? undefined,
      supplierName: (p as any).supplier?.name ?? 'Desconocido',
    }));
  }

  // ─── Utilidades ──────────────────────────────────────────────────────────
  private chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
    return chunks;
  }

  // ─── API pública para notificaciones desde otros módulos ─────────────────
  async notifyAll(message: string) {
    if (!this.bot || !this.allowedChatIds.length) return;
    for (const chatId of this.allowedChatIds) {
      await this.bot.telegram.sendMessage(chatId, message, { parse_mode: 'HTML' }).catch(() => {});
    }
  }
}

interface SearchResult {
  externalId: string;
  title: string;
  costPrice: number;
  stock?: number;
  supplierName: string;
}
