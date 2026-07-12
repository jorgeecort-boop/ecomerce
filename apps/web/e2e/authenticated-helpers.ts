// Helper functions for authenticated E2E tests
import { expect, request as playwrightRequest } from '@playwright/test';
import type { Page } from '@playwright/test';

const API_URL =
  process.env.API_URL || 'http://localhost:3001/api';
const SEED_TOKEN = process.env.E2E_SEED_TOKEN || '';

let seededOnce = false;

export class AuthenticatedHelpers {
  static readonly VENDOR_EMAIL = 'vendor-test@ecomerce.com';
  static readonly VENDOR_PASSWORD = 'VendorTest123!';
  static readonly CUSTOMER_EMAIL = 'customer-test@ecomerce.com';
  static readonly CUSTOMER_PASSWORD = 'CustomerTest123!';

  /**
   * Provisions both test users via the gated /test-seed/create-user endpoint.
   * Idempotent on the server side, but we also memoize per worker process.
   * Requires env var E2E_SEED_TOKEN matching the value set on the API.
   */
  static async ensureTestUsers(): Promise<void> {
    if (seededOnce) return;
    if (!SEED_TOKEN) {
      throw new Error(
        'E2E_SEED_TOKEN env var is required to provision test users. ' +
          'Set it to the value configured on the API (Render dashboard).',
      );
    }

    const ctx = await playwrightRequest.newContext();
    const headers = { 'X-E2E-Seed-Token': SEED_TOKEN };

    for (const user of [
      { email: this.VENDOR_EMAIL, password: this.VENDOR_PASSWORD, name: 'Test Vendor' },
      { email: this.CUSTOMER_EMAIL, password: this.CUSTOMER_PASSWORD, name: 'Test Customer' },
    ]) {
      const res = await ctx.post(`${API_URL}/test-seed/create-user`, {
        headers,
        data: user,
      });
      if (!res.ok()) {
        const body = await res.text();
        throw new Error(
          `Failed to seed ${user.email}: ${res.status()} ${body.slice(0, 200)}`,
        );
      }
    }

    await ctx.dispose();
    seededOnce = true;
  }

  static async loginAsVendor(page: Page) {
    await this.ensureTestUsers();
    await page.goto('/login');
    await page.getByLabel('Email').fill(this.VENDOR_EMAIL);
    await page.getByLabel('Password').fill(this.VENDOR_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  }

  static async loginAsCustomer(page: Page) {
    await this.ensureTestUsers();
    await page.goto('/login');
    await page.getByLabel('Email').fill(this.CUSTOMER_EMAIL);
    await page.getByLabel('Password').fill(this.CUSTOMER_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/$|\/dashboard/);
  }
}
