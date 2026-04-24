import { render, screen } from '@testing-library/react';
import { AsSeenOn, mockPressLogos } from './AsSeenOn';

describe('AsSeenOn', () => {
  it('renders section title and all press items', () => {
    render(<AsSeenOn />);

    expect(screen.getByText(/as seen on/i)).toBeTruthy();
    expect(screen.getAllByRole('link')).toHaveLength(mockPressLogos.length);
    expect(screen.getByRole('link', { name: /wired/i })).toBeTruthy();
  });
});
