import { render, screen, waitFor } from '@testing-library/react';
import { CategoryGrid } from './CategoryGrid';
import { getHomeProducts } from '@/lib/services/home-products';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({
    alt,
    src,
    fill: _fill,
    unoptimized: _unoptimized,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; unoptimized?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={typeof src === 'string' ? src : ''} {...props} />
  ),
}));

jest.mock('@/lib/services/home-products', () => ({
  getHomeProducts: jest.fn(),
}));

const mockedGetHomeProducts = getHomeProducts as jest.MockedFunction<typeof getHomeProducts>;

describe('CategoryGrid', () => {
  beforeEach(() => {
    mockedGetHomeProducts.mockReset();
  });

  it('renders products from service when fetch succeeds', async () => {
    mockedGetHomeProducts.mockResolvedValue([
      {
        id: 'p1',
        name: 'Cafe Blend 1',
        imageUrl: 'https://cdn.example.com/p1.jpg',
        price: 19.9,
        slug: 'demo-store/p1',
      },
      {
        id: 'p2',
        name: 'Cafe Blend 2',
        imageUrl: 'https://cdn.example.com/p2.jpg',
        price: 24.5,
        slug: 'demo-store/p2',
      },
    ]);

    render(<CategoryGrid initialLimit={4} />);

    await waitFor(() => {
      expect(mockedGetHomeProducts).toHaveBeenCalledWith(4);
    });

    await screen.findByRole('link', { name: /cafe blend 1/i });
    expect(screen.getAllByRole('link', { name: /cafe blend/i })).toHaveLength(2);
    expect(screen.getByRole('link', { name: /cafe blend 1/i })).toBeTruthy();
    expect(screen.queryByText(/no pudimos cargar/i)).toBeNull();
  });

  it('renders error state when service fails', async () => {
    mockedGetHomeProducts.mockRejectedValue(new Error('db down'));

    render(<CategoryGrid />);

    const error = await screen.findByText(/no pudimos cargar los productos/i);
    expect(error).toBeTruthy();
    expect(screen.queryByRole('link', { name: /ver producto/i })).toBeNull();
  });
});
