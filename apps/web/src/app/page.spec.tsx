import { render, screen, waitFor } from '@testing-library/react';
import HomePage from './page';
import { getHomeProducts } from '@/lib/services/home-products';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({
    alt,
    src,
    fill: _fill,
    priority: _priority,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    priority?: boolean;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={typeof src === 'string' ? src : ''} {...props} />
  ),
}));

jest.mock('@/lib/services/home-products', () => ({
  getHomeProducts: jest.fn(),
}));

const mockedGetHomeProducts = getHomeProducts as jest.MockedFunction<typeof getHomeProducts>;

describe('HomePage integration', () => {
  it('renders all main sections and keeps header/footer in the same tree without render conflicts', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockedGetHomeProducts.mockResolvedValue([
      {
        id: 'p1',
        name: 'Cafe Blend',
        imageUrl: 'https://cdn.example.com/p1.jpg',
        price: 29.99,
        slug: 'demo-store/p1',
      },
    ]);

    render(<HomePage />);

    expect(screen.getByRole('button', { name: /menu/i })).toBeTruthy();
    expect(screen.getByRole('contentinfo')).toBeTruthy();
    expect(screen.getByRole('heading', { name: /por tiempo limitado/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /explora por categoria/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /feature highlights/i })).toBeTruthy();

    await waitFor(() => {
      expect(screen.getAllByTestId('category-card')).toHaveLength(1);
    });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });
});
