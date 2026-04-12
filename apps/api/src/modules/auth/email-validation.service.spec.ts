/**
 * Unit tests for email-validation.service.ts
 *
 * Tests the EVA + Disify email validation with mocked fetch:
 * - Valid emails pass
 * - Disposable emails are rejected
 * - Invalid format emails are rejected (via Disify format: false)
 * - API failures result in fail-open (valid = true)
 */

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { EmailValidationService } from './email-validation.service';

describe('EmailValidationService', () => {
  let service: EmailValidationService;

  beforeEach(() => {
    service = new EmailValidationService();
    mockFetch.mockReset();
  });

  it('should pass valid email', async () => {
    // EVA says valid (note: real EVA nests under data.data.status)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { status: 'valid', deliverable: true } }),
    });
    // Disify says not disposable
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ format: true, disposable: false }),
    });

    const result = await service.validate('user@gmail.com');
    expect(result.valid).toBe(true);
  });

  it('should reject disposable email', async () => {
    // EVA says valid
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { status: 'valid', deliverable: true } }),
    });
    // Disify says disposable
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ format: true, disposable: true }),
    });

    const result = await service.validate('test@tempmail.com');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Disposable');
  });

  it('should reject invalid email format via Disify format:false', async () => {
    // EVA says unknown (it doesn't know)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { status: 'unknown' } }),
    });
    // Disify says bad format
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ format: false, disposable: false }),
    });

    const result = await service.validate('not-an-email');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Disposable');
  });

  it('should fail-open when both APIs time out', async () => {
    // Both APIs throw (timeout)
    mockFetch.mockRejectedValue(new Error('Network timeout'));

    const result = await service.validate('user@gmail.com');
    // Fail-open: if both APIs fail, we allow the registration
    expect(result.valid).toBe(true);
  });

  it('should reject even if only Disify reports disposable', async () => {
    // EVA fails
    mockFetch.mockRejectedValueOnce(new Error('EVA down'));
    // Disify says disposable
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ format: true, disposable: true }),
    });

    const result = await service.validate('test@yopmail.com');
    expect(result.valid).toBe(false);
  });
});
