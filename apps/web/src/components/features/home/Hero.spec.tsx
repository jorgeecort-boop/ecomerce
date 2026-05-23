import { render, screen } from '@testing-library/react';
import { Hero } from './Hero';

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

describe('Hero', () => {
  it('renders the hero content correctly', () => {
    render(<Hero />);

    expect(
      screen.getByRole('heading', {
        name: /tecnologia que transforma tu setup/i,
      })
    ).toBeTruthy();
    expect(screen.getByText(/los mejores gadgets al mejor precio/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /explorar tienda/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /ver ofertas/i })).toBeTruthy();
  });

  it('links both ctas to the demo store', () => {
    render(<Hero />);

    expect(screen.getByRole('link', { name: /explorar tienda/i }).getAttribute('href')).toBe(
      '/store/tienda-demo'
    );
    expect(screen.getByRole('link', { name: /ver ofertas/i }).getAttribute('href')).toBe(
      '/store/tienda-demo'
    );
  });
});
