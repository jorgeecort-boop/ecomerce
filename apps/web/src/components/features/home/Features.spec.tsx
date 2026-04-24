import { render, screen } from '@testing-library/react';
import { Features, mockFeatures } from './Features';

describe('Features', () => {
  it('renders heading and the expected number of feature cards', () => {
    render(<Features />);

    expect(screen.getByRole('heading', { name: /feature highlights/i })).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(mockFeatures.length);
  });

  it('renders key feature content', () => {
    render(<Features />);

    expect(screen.getByText(/deteccion de productos virales/i)).toBeTruthy();
    expect(screen.getByText(/importacion automatica/i)).toBeTruthy();
  });
});
