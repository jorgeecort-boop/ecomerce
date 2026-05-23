import { render, screen } from '@testing-library/react';
import { CTABanner } from './CTABanner';

describe('CTABanner', () => {
  it('renders title, subtitle and cta links', () => {
    render(<CTABanner />);

    expect(screen.getByRole('heading', { name: /no te pierdas las mejores ofertas en tecnologia/i })).toBeTruthy();
    expect(screen.getByText(/descuentos de hasta el 40%/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /comprar ahora/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /ver ofertas/i })).toBeTruthy();
  });
});
