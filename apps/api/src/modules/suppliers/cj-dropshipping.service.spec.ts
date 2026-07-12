import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CJDropshippingService } from './cj-dropshipping.service';

describe('CJDropshippingService', () => {
  let service: CJDropshippingService;
  let config: { get: jest.Mock };
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    config = {
      get: jest.fn((key: string) => {
        if (key === 'CJ_API_EMAIL') return 'merchant@example.com';
        if (key === 'CJ_API_KEY') return 'secret-key';
        return undefined;
      }),
    };

    fetchMock = jest.fn();
    global.fetch = fetchMock;
    service = new CJDropshippingService(config as unknown as ConfigService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  function okJson(data: unknown) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({ code: 200, data }),
    } as Response);
  }

  it('authenticates with CJ credentials and searches products', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          code: 200,
          data: { accessToken: 'access-1', refreshToken: 'refresh-1' },
        }),
      })
      .mockImplementationOnce(() =>
        okJson({
          list: [{ pid: 'cj-1', productName: 'CJ Product', sellPrice: 10 }],
          total: 1,
          pageNum: 1,
          pageSize: 20,
        })
      );

    const promise = service.searchProducts('earbuds');
    await jest.runOnlyPendingTimersAsync();
    const result = await promise;

    expect(result.products).toHaveLength(1);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/authentication/getAccessToken'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'merchant@example.com', password: 'secret-key' }),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/product/list?'),
      expect.objectContaining({
        headers: expect.objectContaining({ 'CJ-Access-Token': 'access-1' }),
      })
    );
  });

  it('reuses cached token for subsequent requests', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          code: 200,
          data: { accessToken: 'access-1', refreshToken: 'refresh-1' },
        }),
      })
      .mockImplementation(() =>
        okJson({ list: [], total: 0, pageNum: 1, pageSize: 20 })
      );

    let promise = service.searchProducts('one');
    await jest.runOnlyPendingTimersAsync();
    await promise;

    promise = service.searchProducts('two');
    await jest.runOnlyPendingTimersAsync();
    await promise;

    const authCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes('/authentication/getAccessToken')
    );
    expect(authCalls).toHaveLength(1);
  });

  it('throws when CJ credentials are missing', async () => {
    config.get.mockReturnValue(undefined);

    await expect(service.searchProducts('earbuds')).rejects.toThrow(
      'CJ Dropshipping API credentials not configured'
    );
  });

  it('normalizes CJ API errors', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        code: 400,
        message: 'Invalid credentials',
      }),
    });

    await expect(service.searchProducts('earbuds')).rejects.toBeInstanceOf(HttpException);
  });
});
