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
    unoptimized: _unoptimized,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    priority?: boolean;
    unoptimized?: boolean;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={typeof src === 'string' ? src : ''} {...props} />
  ),
}));

jest.mock('@/lib/services/home-products', () => ({
  getHomeProducts: jest.fn(),
}));

jest.mock('@/hooks/useLenis', () => ({
  useLenis: jest.fn(),
}));

jest.mock('gsap', () => {
  const timeline = {
    fromTo: jest.fn().mockReturnThis(),
    to: jest.fn().mockReturnThis(),
    kill: jest.fn(),
  };
  const gsap = {
    registerPlugin: jest.fn(),
    fromTo: jest.fn(),
    to: jest.fn(),
    timeline: jest.fn(() => timeline),
  };
  return { __esModule: true, default: gsap };
});

jest.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: {},
}));

const mockedGetHomeProducts = getHomeProducts as jest.MockedFunction<typeof getHomeProducts>;

describe('HomePage integration', () => {
  beforeEach(() => {
    class MockIntersectionObserver {
      observe = jest.fn();
      unobserve = jest.fn();
      disconnect = jest.fn();
    }

    Object.defineProperty(window, 'IntersectionObserver', {
      writable: true,
      configurable: true,
      value: MockIntersectionObserver,
    });
  });

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

    expect(screen.getByRole('button', { name: /SaraTech/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /productos/i })).toBeTruthy();
    expect(screen.getByRole('contentinfo')).toBeTruthy();
    expect(screen.getByRole('heading', { name: /tecnología que conecta tu mundo/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /productos m.s vendidos/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /explora nuestras categor.as/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /por qu. elegirnos/i })).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /lo que dicen nuestros clientes/i })).toBeTruthy();
    });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });
});
