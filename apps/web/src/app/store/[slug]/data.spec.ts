import { fetchStoreData } from './data';

const mockedFetch = jest.fn();

global.fetch = mockedFetch as unknown as typeof fetch;

const retryOptions = { retryDelaysMs: [0, 0], timeoutMs: 1000 };

describe('fetchStoreData', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it('returns embedded published products when the store response is healthy', async () => {
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          id: 'store-1',
          name: 'Demo Store',
          slug: 'demo-store',
          products: [
            { id: 'p1', title: 'Published', price: 100, isPublished: true },
            { id: 'p2', title: 'Draft', price: 200, isPublished: false },
          ],
        },
      }),
    });

    await expect(fetchStoreData('demo-store', retryOptions)).resolves.toEqual({
      status: 'ok',
      store: expect.objectContaining({ id: 'store-1', slug: 'demo-store' }),
      products: [expect.objectContaining({ id: 'p1' })],
      error: null,
    });
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it('retries transient store API failures before returning healthy data', async () => {
    mockedFetch
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => null })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            id: 'store-1',
            name: 'Demo Store',
            slug: 'demo-store',
            products: [],
          },
        }),
      });

    const result = await fetchStoreData('demo-store', retryOptions);

    expect(result.status).toBe('ok');
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });

  it('returns not_found for a missing store without retrying', async () => {
    mockedFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Not found' }),
    });

    await expect(fetchStoreData('missing-store', retryOptions)).resolves.toEqual({
      status: 'not_found',
      store: null,
      products: [],
      error: 'Store not found',
    });
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  it('returns unavailable after repeated transient failures', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ message: 'Cold start' }),
    });

    await expect(fetchStoreData('demo-store', retryOptions)).resolves.toEqual({
      status: 'unavailable',
      store: null,
      products: [],
      error: 'API returned 503',
    });
    expect(mockedFetch).toHaveBeenCalledTimes(3);
  });

  it('falls back to the products endpoint when products are not embedded', async () => {
    mockedFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            id: 'store-1',
            name: 'Demo Store',
            slug: 'demo-store',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ id: 'p1', title: 'Fetched Product', price: 100, isPublished: true }],
        }),
      });

    const result = await fetchStoreData('demo-store', retryOptions);

    expect(result).toMatchObject({
      status: 'ok',
      products: [expect.objectContaining({ id: 'p1' })],
    });
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });
});
