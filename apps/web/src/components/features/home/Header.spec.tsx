import { fireEvent, render, screen } from '@testing-library/react';
import { Header } from './Header';

describe('Header', () => {
  it('renders logo, nav items and action buttons', () => {
    render(<Header />);

    expect(screen.getByRole('link', { name: /inicio/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /maquinas/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /buscar/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /carrito/i })).toBeTruthy();
  });

  it('toggles mobile menu open and close when menu button is clicked', () => {
    render(<Header />);

    const menuButton = screen.getByRole('button', { name: /menu/i });

    expect(menuButton.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('navigation', { name: /navegacion movil/i })).toBeNull();

    fireEvent.click(menuButton);

    expect(menuButton.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('navigation', { name: /navegacion movil/i })).toBeTruthy();

    fireEvent.click(menuButton);

    expect(menuButton.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('navigation', { name: /navegacion movil/i })).toBeNull();
  });
});
