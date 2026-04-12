import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ShippoShipment {
  object_id: string;
  status: string;
  carrier: string;
  servicelevel: { name: string; token: string };
  tracking_number: string;
  tracking_url_provider: string;
  tracking_history: ShippoTrackingEvent[];
  tracking_status: ShippoTrackingStatus | null;
  eta?: string;
  address_from?: ShippoAddress;
  address_to?: ShippoAddress;
}

export interface ShippoTrackingStatus {
  object_created: string;
  object_updated: string;
  object_id: string;
  status: 'UNKNOWN' | 'PRE_TRANSIT' | 'TRANSIT' | 'DELIVERED' | 'RETURNED' | 'FAILURE';
  status_details: string;
  status_date: string;
  location: { city?: string; state?: string; zip?: string; country?: string };
}

export interface ShippoTrackingEvent {
  object_created: string;
  object_id: string;
  status: string;
  status_details: string;
  status_date: string;
  location: { city?: string; state?: string; zip?: string; country?: string };
}

export interface ShippoAddress {
  name: string;
  street1: string;
  city: string;
  state?: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
}

export interface ShippoParcel {
  length: string;
  width: string;
  height: string;
  distance_unit: 'in' | 'cm';
  weight: string;
  mass_unit: 'lb' | 'g' | 'oz' | 'kg';
}

export interface ShippoRate {
  object_id: string;
  carrier: string;
  servicelevel: { name: string; token: string; terms?: string };
  amount: string;
  currency: string;
  amount_local: string;
  currency_local: string;
  estimated_days?: number;
  arrives_by?: string;
  duration_terms?: string;
}

export interface ShippoLabel {
  object_id: string;
  status: string;
  label_url: string;
  tracking_number: string;
  tracking_url_provider: string;
  rate: ShippoRate;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ShippoService
 *
 * Official Shippo API: https://goshippo.com/docs/
 * Multi-carrier: FedEx, UPS, USPS, DHL, Canada Post, Australia Post, and 50+ more.
 *
 * Free tier: 500 API calls/month, unlimited test labels.
 * Registration: https://app.goshippo.com/register (no credit card)
 *
 * Required env var:
 *   SHIPPO_API_KEY — from Settings → API in your Shippo account
 *                    Format: "shippo_test_xxx" (test) or "shippo_live_xxx" (live)
 */
@Injectable()
export class ShippoService {
  private readonly logger = new Logger(ShippoService.name);
  private readonly BASE_URL = 'https://api.goshippo.com';

  constructor(private config: ConfigService) {}

  // ── Tracking ──────────────────────────────────────────────────────────────

  /**
   * Get full tracking information for a shipment.
   * Shippo detects the carrier automatically from the tracking number.
   *
   * @param trackingNumber  The tracking number from the supplier (e.g. "9400111899223096940496")
   * @param carrier         Optional carrier code (e.g. "usps", "fedex", "ups", "dhl_express")
   *                        If not provided, Shippo auto-detects.
   */
  async getTracking(
    trackingNumber: string,
    carrier?: string,
  ): Promise<ShippoShipment | null> {
    try {
      const carrierPath = carrier ? encodeURIComponent(carrier) : 'unknown';
      const data = await this.request<ShippoShipment>(
        `/tracks/${carrierPath}/${encodeURIComponent(trackingNumber)}`,
        'GET',
      );
      return data;
    } catch (err) {
      this.logger.warn(`Shippo tracking not found: ${trackingNumber}`);
      return null;
    }
  }

  /**
   * Register a tracking number to receive webhook updates.
   * Shippo will POST to your webhook URL when status changes.
   *
   * @param trackingNumber  The tracking number to register
   * @param carrier         Carrier code
   * @param metadata        Optional metadata (your order ID, etc.)
   */
  async registerTracking(
    trackingNumber: string,
    carrier: string,
    metadata?: string,
  ): Promise<ShippoShipment | null> {
    try {
      const data = await this.request<ShippoShipment>('/tracks/', 'POST', {
        tracking_number: trackingNumber,
        carrier,
        metadata,
      });
      return data;
    } catch (err) {
      this.logger.warn(`Shippo register tracking failed: ${trackingNumber}`);
      return null;
    }
  }

  // ── Shipping Rates ──────────────────────────────────────────────────────────

  /**
   * Get shipping rates from multiple carriers for a shipment.
   * Returns sorted rates (cheapest first by default).
   *
   * This is called during checkout to show real shipping costs.
   */
  async getRates(
    addressFrom: ShippoAddress,
    addressTo: ShippoAddress,
    parcel: ShippoParcel,
    currencyCode = 'USD',
  ): Promise<ShippoRate[]> {
    // Step 1: Create a shipment to get available rates
    const shipment = await this.request<{
      object_id: string;
      rates: ShippoRate[];
      status: string;
    }>('/shipments/', 'POST', {
      address_from: addressFrom,
      address_to: addressTo,
      parcels: [parcel],
      async: false, // wait for rates synchronously
      currency: currencyCode,
    });

    // Sort by price ascending
    return (shipment.rates ?? []).sort(
      (a, b) => parseFloat(a.amount) - parseFloat(b.amount)
    );
  }

  /**
   * Purchase a shipping label for a specific rate.
   * Returns the label URL and tracking number.
   */
  async purchaseLabel(rateObjectId: string): Promise<ShippoLabel> {
    const label = await this.request<ShippoLabel>('/transactions/', 'POST', {
      rate: rateObjectId,
      label_file_type: 'PDF',
      async: false,
    });
    return label;
  }

  // ── Address Validation ────────────────────────────────────────────────────

  /**
   * Validate a shipping address before creating a label.
   * Catches typos and wrong zip codes before charging the customer.
   */
  async validateAddress(
    address: ShippoAddress,
  ): Promise<{ valid: boolean; messages?: { type: string; text: string }[] }> {
    const data = await this.request<{
      object_id: string;
      is_complete: boolean;
      validation_results: { is_valid: boolean; messages: { type: string; text: string }[] };
    }>('/addresses/', 'POST', { ...address, validate: true });

    return {
      valid: data.validation_results?.is_valid ?? data.is_complete,
      messages: data.validation_results?.messages ?? [],
    };
  }

  // ── Carriers ────────────────────────────────────────────────────────────────

  /**
   * Get a list of available carrier accounts connected to your Shippo account.
   */
  async getCarrierAccounts(): Promise<
    { carrier: string; description: string; active: boolean }[]
  > {
    const data = await this.request<{
      results: { carrier: string; description: string; active: boolean }[];
    }>('/carrier_accounts/', 'GET');
    return data.results ?? [];
  }

  // ── Refunds ─────────────────────────────────────────────────────────────────

  /**
   * Request a refund for a purchased label (if the package hasn't been accepted yet).
   */
  async refundLabel(
    transactionObjectId: string,
  ): Promise<{ status: string; refund: { object_id: string; status: string } }> {
    const data = await this.request<{ object_id: string; status: string }>(
      '/refunds/',
      'POST',
      { transaction: transactionObjectId },
    );
    return { status: data.status, refund: data };
  }

  // ── Internal HTTP helper ──────────────────────────────────────────────────

  private async request<T>(
    path: string,
    method: 'GET' | 'POST' | 'PUT',
    body?: Record<string, unknown>,
  ): Promise<T> {
    const apiKey = this.config.get<string>('SHIPPO_API_KEY');

    if (!apiKey) {
      this.logger.warn('SHIPPO_API_KEY not configured');
      throw new Error('Shippo API key not configured');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const res = await fetch(`${this.BASE_URL}${path}`, {
        method,
        headers: {
          Authorization: `ShippoToken ${apiKey}`,
          'Content-Type': 'application/json',
          'Shippo-API-Version': '2018-02-08',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as Record<string, unknown>;
        throw new HttpException(
          `Shippo API error ${res.status}: ${JSON.stringify(err)}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      return (await res.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}
