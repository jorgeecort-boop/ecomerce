import { render, screen } from '@testing-library/react';
import { CategoryGrid, mockCategories } from './CategoryGrid';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({
    alt,
    src,
    fill: _fill,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={typeof src === 'string' ? src : ''} {...props} />
  ),
}));

describe('CategoryGrid', () => {
  it('renders the same number of cards as mockCategories length', () => {
    render(<CategoryGrid />);

    const cards = screen.getAllByTestId('category-card');
    expect(cards).toHaveLength(mockCategories.length);
  });

  it('renders key category labels and links', () => {
    render(<CategoryGrid />);

    expect(screen.getByRole('heading', { name: /explora por categoria/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /maquinas de cafe/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /capsulas premium/i })).toBeTruthy();
  });
});
