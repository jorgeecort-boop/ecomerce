import { render, screen } from '@testing-library/react';
import { AnnouncementBar } from './AnnouncementBar';

describe('AnnouncementBar', () => {
  it('renders message and link correctly', () => {
    render(<AnnouncementBar />);

    expect(screen.getByText(/ofertas de temporada/i)).toBeTruthy();
    expect(screen.getByText(/-40% off/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /comprar ahora/i })).toBeTruthy();
  });

  it('links to the demo store', () => {
    render(<AnnouncementBar />);

    expect(screen.getByRole('link', { name: /comprar ahora/i }).getAttribute('href')).toBe(
      '/store/tienda-demo'
    );
  });
});
