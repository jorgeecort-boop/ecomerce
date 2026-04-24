import { render, screen } from '@testing-library/react';
import { AnnouncementBar } from './AnnouncementBar';

describe('AnnouncementBar', () => {
  it('renders message and link correctly', () => {
    render(<AnnouncementBar />);

    expect(screen.getByText(/envio gratis a partir de \$69/i)).toBeTruthy();
    expect(
      screen.getByRole('link', { name: /descubre nuestras nuevas capsulas premium\./i })
    ).toBeTruthy();
  });

  it('renders custom props correctly', () => {
    render(
      <AnnouncementBar
        prefixText="Solo por hoy"
        linkText="Ver ofertas flash"
        linkHref="/ofertas"
      />
    );

    expect(screen.getByText(/solo por hoy/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /ver ofertas flash/i })).toBeTruthy();
  });
});
