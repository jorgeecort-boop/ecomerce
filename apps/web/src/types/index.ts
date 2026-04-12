export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  logoUrl?: string;
  ownerId: string;
  isActive: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  storeId: string;
  title: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  sku?: string;
  images: string[];
  category?: string;
  tags: string[];
  isPublished: boolean;
  isFeatured: boolean;
  inventory: number;
  trendScore?: number;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  total: number;
  title: string;
  sku?: string;
  imageUrl?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  storeId: string;
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress: Address;
  stripePaymentId?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  createdAt: string;
}

export interface Address {
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  paidOrders: number;
  shippedOrders: number;
  totalRevenue: number;
}
