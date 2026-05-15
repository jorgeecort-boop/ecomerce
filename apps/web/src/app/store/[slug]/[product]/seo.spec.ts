import { generateProductMetadata } from './seo';

const mockedFetch = jest.fn();

global.fetch = mockedFetch as unknown as typeof fetch;

describe('generateProductMetadata', () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  beforeEach(() => {
    mockedFetch.mockReset();
    process.env.NEXT_PUBLIC_APP_URL = 'https://shop.example.com';
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  });

  it('returns product metadata with Open Graph and Twitter data when API responses are valid', async () => {
    mockedFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { name: 'Demo Store' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 'ring-light',
            title: 'Ring Light',
            description: 'Portable light for creators',
            imageUrl: 'https://cdn.example.com/ring-light.jpg',
          },
        }),
      });

    const metadata = await generateProductMetadata({
      slug: 'demo-store',
      product: 'ring-light',
    });

    expect(metadata.title).toBe('Ring Light - Demo Store');
    expect(metadata.description).toBe('Portable light for creators');
    expect(metadata.openGraph).toMatchObject({
      title: 'Ring Light - Demo Store',
      description: 'Portable light for creators',
      type: 'website',
      url: 'https://shop.example.com/store/demo-store/ring-light',
      siteName: 'Demo Store',
      locale: 'es_CO',
      images: [
        {
          url: 'https://cdn.example.com/ring-light.jpg',
          width: 600,
          height: 600,
          alt: 'Ring Light',
        },
      ],
    });
    expect(metadata.twitter).toMatchObject({
      card: 'summary_large_image',
      title: 'Ring Light - Demo Store',
      description: 'Portable light for creators',
      images: ['https://cdn.example.com/ring-light.jpg'],
    });
  });

  it('returns fallback metadata instead of throwing when API responses fail', async () => {
    mockedFetch
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) });

    await expect(
      generateProductMetadata({ slug: 'demo-store', product: 'ring-light' })
    ).resolves.toEqual({ title: 'Product' });
  });

  it('returns fallback metadata instead of throwing when fetch rejects', async () => {
    mockedFetch.mockRejectedValue(new Error('API unavailable'));

    await expect(
      generateProductMetadata({ slug: 'demo-store', product: 'ring-light' })
    ).resolves.toEqual({ title: 'Product' });
  });

  it('omits social images when the product has no image', async () => {
    mockedFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { name: 'Demo Store' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 'ring-light',
            title: 'Ring Light',
          },
        }),
      });

    const metadata = await generateProductMetadata({
      slug: 'demo-store',
      product: 'ring-light',
    });

    expect(metadata.openGraph).not.toHaveProperty('images');
    expect(metadata.twitter).not.toHaveProperty('images');
  });
});
