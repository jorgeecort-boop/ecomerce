// Helper functions for authenticated E2E tests
import { expect } from '@playwright/test';
import type { APIRequestContext, Page } from '@playwright/test';

export class AuthenticatedHelpers {
  // Test credentials - these should match test users in the database
  static readonly VENDOR_EMAIL = 'vendor-test@ecomerce.com';
  static readonly VENDOR_PASSWORD = 'VendorTest123!';
  static readonly CUSTOMER_EMAIL = 'customer-test@ecomerce.com';
  static readonly CUSTOMER_PASSWORD = 'CustomerTest123!';

  // Login as vendor
  static async loginAsVendor(page: Page) {
    await page.goto('/login');
    await page.getByLabel('Email').fill(this.VENDOR_EMAIL);
    await page.getByLabel('Password').fill(this.VENDOR_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard$/);
  }

  // Login as customer
  static async loginAsCustomer(page: Page) {
    await page.goto('/login');
    await page.getByLabel('Email').fill(this.CUSTOMER_EMAIL);
    await page.getByLabel('Password').fill(this.CUSTOMER_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for redirect to homepage or store
    await expect(page).toHaveURL(/\/$/);
  }

  // Note: In a real implementation, you would have API endpoints for test user creation/cleanup
  // For now, we assume test users exist or we'll handle errors gracefully

  // Create a test vendor user via API (if endpoint exists)
  static async createTestVendor(request: APIRequestContext) {
    const response = await request.post('/api/test/create-vendor', {
      data: {
        email: this.VENDOR_EMAIL,
        password: this.VENDOR_PASSWORD,
        name: 'Test Vendor',
      },
    });
    return response.ok();
  }

  // Create a test customer user via API (if endpoint exists)
  static async createTestCustomer(request: APIRequestContext) {
    const response = await request.post('/api/test/create-customer', {
      data: {
        email: this.CUSTOMER_EMAIL,
        password: this.CUSTOMER_PASSWORD,
        name: 'Test Customer',
      },
    });
    return response.ok();
  }

  // Clean up test data
  static async cleanupTestData(request: APIRequestContext) {
    await request.delete(`/api/test/cleanup?email=${this.VENDOR_EMAIL}`);
    await request.delete(`/api/test/cleanup?email=${this.CUSTOMER_EMAIL}`);
  }
}
