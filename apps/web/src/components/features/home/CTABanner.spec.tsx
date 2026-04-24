import { render, screen } from '@testing-library/react';
import { CTABanner } from './CTABanner';

describe('CTABanner', () => {
  it('renders title, subtitle and cta links', () => {
    render(<CTABanner />);

    expect(screen.getByRole('heading', { name: /listo para vender mas en tu tienda/i })).toBeTruthy();
    expect(screen.getByText(/automatiza pedidos y mejora conversion/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /comenzar ahora/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /ver demo/i })).toBeTruthy();
  });
});
