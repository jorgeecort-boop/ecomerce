import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CheckoutPage from './[slug]/checkout/page';

const stableSearchParams = {
  get: (key: string) => {
    if (key !== 'items') return null;
    return JSON.stringify([
      {
        id: 'prod_1',
        title: 'Wireless Earbuds',
        price: 49.99,
        quantity: 1,
      },
    ]);
  },
};

jest.mock('next/navigation', () => ({
  useSearchParams: () => stableSearchParams,
}));

jest.mock('@/hooks/useCurrency', () => ({
  useCurrency: () => ({
    format: (amount: number) => `$${amount.toFixed(2)}`,
    currency: 'USD',
  }),
}));

describe('Checkout shipping flow', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    window.scrollTo = jest.fn();
  });

  it('moves from shipping step to payment step when shipping validation succeeds', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: true }),
    });

    render(<CheckoutPage params={{ slug: 'test-store' }} />);

    fireEvent.click(screen.getByRole('button', { name: /continue to shipping/i }));

    fireEvent.change(screen.getByPlaceholderText('John'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByPlaceholderText('Doe'), { target: { value: 'Customer' } });
    fireEvent.change(screen.getByPlaceholderText('john@example.com'), {
      target: { value: 'customer@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Calle 123 #45-67'), {
      target: { value: '123 Test Street' },
    });
    fireEvent.change(screen.getByPlaceholderText('Cali'), { target: { value: 'Bogota' } });
    fireEvent.change(screen.getByPlaceholderText('760001'), { target: { value: '110111' } });

    fireEvent.click(screen.getByRole('button', { name: /continue to payment/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Payment' })).toBeTruthy();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/orders/validate-shipping'),
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('shows clear error and stays on shipping when validation API fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Shipping service unavailable' }),
    });

    render(<CheckoutPage params={{ slug: 'test-store' }} />);

    fireEvent.click(screen.getByRole('button', { name: /continue to shipping/i }));

    fireEvent.change(screen.getByPlaceholderText('John'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByPlaceholderText('Doe'), { target: { value: 'Customer' } });
    fireEvent.change(screen.getByPlaceholderText('john@example.com'), {
      target: { value: 'customer@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Calle 123 #45-67'), {
      target: { value: '123 Test Street' },
    });
    fireEvent.change(screen.getByPlaceholderText('Cali'), { target: { value: 'Bogota' } });
    fireEvent.change(screen.getByPlaceholderText('760001'), { target: { value: '110111' } });

    fireEvent.click(screen.getByRole('button', { name: /continue to payment/i }));

    await waitFor(() => {
      expect(screen.getByText(/shipping service unavailable/i)).toBeTruthy();
    });

    expect(screen.getByRole('heading', { name: 'Shipping Information' })).toBeTruthy();
  });
});
