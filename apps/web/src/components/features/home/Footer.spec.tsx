import { render, screen } from '@testing-library/react';
import { Footer, mockFooterLegalLinks, mockFooterLinks } from './Footer';

describe('Footer', () => {
  it('renders main footer links in the dom', () => {
    render(<Footer />);

    for (const link of mockFooterLinks) {
      expect(screen.getByRole('link', { name: new RegExp(link.label, 'i') })).toBeTruthy();
    }
  });

  it('renders legal links and brand text', () => {
    render(<Footer />);

    for (const link of mockFooterLegalLinks) {
      expect(screen.getByRole('link', { name: new RegExp(link.label, 'i') })).toBeTruthy();
    }
    expect(screen.getAllByText(/SaraTech/i).length).toBeGreaterThan(0);
  });
});
