import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * CloudinaryService
 *
 * Upload, transform and manage product images via Cloudinary.
 *
 * Free tier: 25 credits/month (~25 GB storage, 25 GB bandwidth)
 * Registration: https://cloudinary.com/users/register/free
 *
 * Required env vars:
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 *
 * Uses the Upload API directly (no SDK dependency needed).
 */
@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private config: ConfigService) {}

  get isConfigured(): boolean {
    return !!(
      this.config.get('CLOUDINARY_CLOUD_NAME') &&
      this.config.get('CLOUDINARY_API_KEY') &&
      this.config.get('CLOUDINARY_API_SECRET')
    );
  }

  /**
   * Upload an image from a URL (for importing supplier product images).
   */
  async uploadFromUrl(
    imageUrl: string,
    options?: { folder?: string; publicId?: string }
  ): Promise<{ url: string; publicId: string; width: number; height: number }> {
    return this.upload({ file: imageUrl, ...options });
  }

  /**
   * Upload a base64-encoded image (for user file uploads).
   */
  async uploadBase64(
    base64Data: string,
    options?: { folder?: string; publicId?: string }
  ): Promise<{ url: string; publicId: string; width: number; height: number }> {
    const file = base64Data.startsWith('data:')
      ? base64Data
      : `data:image/jpeg;base64,${base64Data}`;
    return this.upload({ file, ...options });
  }

  /**
   * Delete an uploaded image by its public ID.
   */
  async deleteImage(publicId: string): Promise<{ success: boolean }> {
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('Cloudinary not configured');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = this.generateSignature(
      { public_id: publicId, timestamp: String(timestamp) },
      apiSecret
    );

    const body = new URLSearchParams({
      public_id: publicId,
      timestamp: String(timestamp),
      api_key: apiKey,
      signature,
    });

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: 'POST',
      body,
    });

    if (!res.ok) {
      this.logger.warn(`Cloudinary delete failed for ${publicId}`);
      return { success: false };
    }

    return { success: true };
  }

  /**
   * Generate an optimized image URL with transformations.
   */
  getOptimizedUrl(
    publicId: string,
    options?: {
      width?: number;
      height?: number;
      quality?: string;
      format?: string;
      crop?: string;
    }
  ): string {
    const cloudName = this.config.get('CLOUDINARY_CLOUD_NAME');
    if (!cloudName) return '';

    const transforms: string[] = [];
    if (options?.width) transforms.push(`w_${options.width}`);
    if (options?.height) transforms.push(`h_${options.height}`);
    if (options?.crop) transforms.push(`c_${options.crop}`);
    if (options?.quality) transforms.push(`q_${options.quality}`);
    if (options?.format) transforms.push(`f_${options.format}`);

    // Always add auto quality and format if not specified
    if (!options?.quality) transforms.push('q_auto');
    if (!options?.format) transforms.push('f_auto');

    const transformStr = transforms.length > 0 ? transforms.join(',') + '/' : '';
    return `https://res.cloudinary.com/${cloudName}/image/upload/${transformStr}${publicId}`;
  }

  /**
   * Generate a signed upload URL for direct browser uploads.
   * Returns params the frontend needs to POST directly to Cloudinary.
   */
  getUploadParams(folder = 'products'): {
    url: string;
    params: Record<string, string>;
  } | null {
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) return null;

    const timestamp = Math.floor(Date.now() / 1000);

    // For unsigned uploads, no signature needed if you create an upload preset
    // For signed uploads:
    const paramsToSign = {
      folder,
      timestamp: String(timestamp),
    };

    // Synchronous signature generation not ideal, but acceptable for param generation
    const sortedParams = Object.keys(paramsToSign)
      .sort()
      .map((k) => `${k}=${paramsToSign[k as keyof typeof paramsToSign]}`)
      .join('&');

    // We'll compute signature inline for param generation
    const { createHash } = require('crypto');
    const signature: string = createHash('sha1')
      .update(sortedParams + apiSecret)
      .digest('hex');

    return {
      url: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      params: {
        api_key: apiKey,
        timestamp: String(timestamp),
        folder,
        signature,
      },
    };
  }

  // ── Internal ───────────────────────────────────────────────────────────

  private async upload(opts: {
    file: string;
    folder?: string;
    publicId?: string;
  }): Promise<{ url: string; publicId: string; width: number; height: number }> {
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new HttpException(
        'Cloudinary not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET to .env',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = opts.folder ?? 'products';

    const paramsToSign: Record<string, string> = {
      folder,
      timestamp: String(timestamp),
    };
    if (opts.publicId) paramsToSign.public_id = opts.publicId;

    const signature = this.generateSignature(paramsToSign, apiSecret);

    const body = new URLSearchParams({
      file: opts.file,
      api_key: apiKey,
      timestamp: String(timestamp),
      folder,
      signature,
    });
    if (opts.publicId) body.append('public_id', opts.publicId);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body,
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`Cloudinary upload failed: ${err}`);
      throw new HttpException('Image upload failed', HttpStatus.BAD_GATEWAY);
    }

    const data = (await res.json()) as {
      secure_url: string;
      public_id: string;
      width: number;
      height: number;
    };

    return {
      url: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
    };
  }

  private generateSignature(params: Record<string, string>, apiSecret: string): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&');

    return crypto
      .createHash('sha1')
      .update(sortedParams + apiSecret)
      .digest('hex');
  }
}
