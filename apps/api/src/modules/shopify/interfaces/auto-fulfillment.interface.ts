export interface IAutoFulfillmentService {
  getStats(storeId?: string): Promise<{
    totalOrders: number;
    pendingOrders: number;
    fulfillmentRate: number;
    totalRevenue: number;
  }>;
  getSyncedOrders(storeId?: string): Promise<any[]>;
}
