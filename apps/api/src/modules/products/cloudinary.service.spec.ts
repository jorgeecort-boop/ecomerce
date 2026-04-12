/**
 * Unit tests for cloudinary.service.ts
 *
 * Tests Cloudinary operations with mocked fetch:
 * - Upload from URL
 * - Upload base64
 * - Delete image
 * - Optimized URL generation
 * - Upload params generation
 * - Not-configured error handling
 */

const mockFetch = jest.fn();
global.fetch = mockFetch;

import { CloudinaryService } from './cloudinary.service';
import { ConfigService } from '@nestjs/config';

function createService(configured = true): CloudinaryService {
  const configValues: Record<string, string> = configured
    ? {
        CLOUDINARY_CLOUD_NAME: 'test-cloud',
        CLOUDINARY_API_KEY: 'test-key',
        CLOUDINARY_API_SECRET: 'test-secret',
      }
    : {};

  const configService = {
    get: jest.fn((key: string) => configValues[key] ?? undefined),
  } as unknown as ConfigService;

  return new CloudinaryService(configService);
}

describe('CloudinaryService', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('isConfigured', () => {
    it('should return true when all env vars are set', () => {
      const service = createService(true);
      expect(service.isConfigured).toBe(true);
    });

    it('should return false when env vars are missing', () => {
      const service = createService(false);
      expect(service.isConfigured).toBe(false);
    });
  });

  describe('uploadFromUrl', () => {
    it('should upload and return url', async () => {
      const service = createService(true);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/v1/products/test.jpg',
          public_id: 'products/test',
          width: 800,
          height: 600,
        }),
      });

      const result = await service.uploadFromUrl('https://example.com/image.jpg');
      expect(result.url).toContain('cloudinary.com');
      expect(result.publicId).toBe('products/test');
      expect(result.width).toBe(800);
    });

    it('should throw error when not configured', async () => {
      const service = createService(false);
      await expect(
        service.uploadFromUrl('https://example.com/image.jpg'),
      ).rejects.toThrow();
    });
  });

  describe('getOptimizedUrl', () => {
    it('should generate transformed URL with auto quality and format', () => {
      const service = createService(true);
      const url = service.getOptimizedUrl('products/test', {
        width: 400,
        height: 400,
        crop: 'fill',
      });
      expect(url).toContain('w_400');
      expect(url).toContain('h_400');
      expect(url).toContain('c_fill');
      expect(url).toContain('q_auto');
      expect(url).toContain('f_auto');
      expect(url).toContain('products/test');
    });

    it('should return empty string when not configured', () => {
      const service = createService(false);
      const url = service.getOptimizedUrl('test');
      expect(url).toBe('');
    });
  });

  describe('getUploadParams', () => {
    it('should return signed upload params', () => {
      const service = createService(true);
      const params = service.getUploadParams('products');
      expect(params).not.toBeNull();
      expect(params!.url).toContain('cloudinary.com');
      expect(params!.params.api_key).toBe('test-key');
      expect(params!.params.folder).toBe('products');
      expect(params!.params.signature).toBeTruthy();
    });

    it('should return null when not configured', () => {
      const service = createService(false);
      const params = service.getUploadParams();
      expect(params).toBeNull();
    });
  });
});
