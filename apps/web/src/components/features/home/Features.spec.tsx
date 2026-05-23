import { render, screen } from '@testing-library/react';
import { Features } from './Features';

describe('Features', () => {
  it('renders heading and the expected number of feature cards', () => {
    render(<Features />);

    expect(screen.getByRole('heading', { name: /por que elegirnos/i })).toBeTruthy();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(4);
  });

  it('renders key feature content', () => {
    render(<Features />);

    expect(screen.getByText(/calidad garantizada/i)).toBeTruthy();
    expect(screen.getByText(/envio express/i)).toBeTruthy();
  });
});
