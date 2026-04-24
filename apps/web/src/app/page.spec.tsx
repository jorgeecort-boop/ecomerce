import { render, screen } from '@testing-library/react';
import HomePage from './page';

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

describe('HomePage integration', () => {
  it('renders all main sections and keeps header/footer in the same tree without render conflicts', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    render(<HomePage />);

    expect(screen.getByRole('button', { name: /menu/i })).toBeTruthy();
    expect(screen.getByRole('contentinfo')).toBeTruthy();
    expect(screen.getByRole('heading', { name: /por tiempo limitado/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /explora por categoria/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /feature highlights/i })).toBeTruthy();

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });
});
