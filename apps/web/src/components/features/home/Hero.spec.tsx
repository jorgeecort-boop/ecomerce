import { fireEvent, render, screen } from '@testing-library/react';
import { Hero } from './Hero';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({
    alt,
    src,
    fill: _fill,
    priority: _priority,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    priority?: boolean;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={typeof src === 'string' ? src : ''} {...props} />
  ),
}));

describe('Hero', () => {
  it('renders the hero content correctly', () => {
    render(<Hero />);

    expect(
      screen.getByRole('heading', {
        name: /por tiempo limitado, consigue tu maquina por solo \$159\./i,
      })
    ).toBeTruthy();
    expect(screen.getByText(/requiere una compra inicial de 3 cajas/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /reclamar oferta/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /ver como funciona/i })).toBeTruthy();
    expect(screen.getByAltText(/persona disfrutando cafe/i)).toBeTruthy();
  });

  it('calls the action handlers when the ctas are clicked', () => {
    const onPrimaryAction = jest.fn();
    const onSecondaryAction = jest.fn();

    render(
      <Hero
        onPrimaryAction={onPrimaryAction}
        onSecondaryAction={onSecondaryAction}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /reclamar oferta/i }));
    fireEvent.click(screen.getByRole('button', { name: /ver como funciona/i }));

    expect(onPrimaryAction).toHaveBeenCalledTimes(1);
    expect(onSecondaryAction).toHaveBeenCalledTimes(1);
  });
});
