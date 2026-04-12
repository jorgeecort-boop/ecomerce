import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../config/prisma.service';
import { SupplierApiService } from './supplier-api.service';

@Injectable()
export class InventorySyncService {
  private readonly logger = new Logger(InventorySyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supplierApi: SupplierApiService,
  ) {}

  /**
   * Sincroniza inventario de proveedores cada 6 horas.
   * Actualiza stock y precios de SupplierProduct.
   * Si el stock cae a 0, marca el producto como no publicado.
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async syncInventory(): Promise<void> {
    this.logger.log('Starting inventory sync...');

    try {
      // Obtener todos los productos de proveedores activos
      const supplierProducts = await this.prisma.supplierProduct.findMany({
        where: { isMapped: true },
        select: { id: true, supplierId: true, externalId: true, ourProductId: true },
        take: 100, // Procesar en lotes para no sobrecargar la API
      });

      let updated = 0;
      let outOfStock = 0;

      for (const sp of supplierProducts) {
        try {
          const fresh = await this.supplierApi.getProductDetails(sp.supplierId, sp.externalId);
          if (!fresh) continue;

          await this.prisma.supplierProduct.update({
            where: { id: sp.id },
            data: {
              price: fresh.price,
              costPrice: fresh.costPrice,
              stock: fresh.stock ?? null,
              lastSyncedAt: new Date(),
            },
          });

          // Si el producto está en nuestra tienda y se quedó sin stock
          if (sp.ourProductId && fresh.stock !== undefined && fresh.stock <= 0) {
            await this.prisma.product.update({
              where: { id: sp.ourProductId },
              data: { inventory: 0, isPublished: false },
            });
            outOfStock++;
          }

          updated++;
        } catch (err: any) {
          this.logger.warn(`Failed to sync product ${sp.externalId}: ${err?.message ?? err}`);
        }
      }

      this.logger.log(`Inventory sync complete: ${updated} updated, ${outOfStock} out-of-stock`);
    } catch (err: any) {
      this.logger.error(`Inventory sync failed: ${err?.message ?? err}`);
    }
  }

  /**
   * Alerta de stock bajo cada hora.
   * Notifica productos con inventario <= threshold.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkLowStock(): Promise<void> {
    const LOW_STOCK_THRESHOLD = 5;

    const lowStockProducts = await this.prisma.product.findMany({
      where: {
        trackInventory: true,
        isPublished: true,
        inventory: { lte: LOW_STOCK_THRESHOLD, gt: 0 },
      },
      select: {
        id: true,
        title: true,
        inventory: true,
        store: { select: { name: true } },
      },
    });

    if (lowStockProducts.length > 0) {
      this.logger.warn(
        `Low stock alert: ${lowStockProducts.length} products below ${LOW_STOCK_THRESHOLD} units`,
      );
    }
  }
}
