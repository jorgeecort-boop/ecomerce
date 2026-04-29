/**
 * useCurrency hook
 *
 * Features:
 * - Auto-detects visitor's currency via backend IP detection (cached)
 * - Fetches exchange rate from USD (the store's base currency)
 * - Formats prices in the visitor's local currency
 * - Caches the rate in sessionStorage to avoid repeated API calls
 */

import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '@ecomerce/utils';

const BASE_CURRENCY = 'USD';

// Supported currencies with symbols
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', JPY: '¥', CAD: 'C$',
  AUD: 'A$', CHF: 'CHF', CNY: '¥', MXN: 'MX$', BRL: 'R$',
  INR: '₹', KRW: '₩', SGD: 'S$', HKD: 'HK$', SEK: 'kr',
  NOK: 'kr', DKK: 'kr', PLN: 'zł', CZK: 'Kč', HUF: 'Ft',
  RON: 'lei', BGN: 'лв', HRK: 'kn', ISK: 'kr', TRY: '₺',
  RUB: '₽', ZAR: 'R', AED: 'د.إ', SAR: '﷼', CLP: 'CLP$',
  COP: 'COP$', ARS: 'ARS$', PEN: 'S/', VND: '₫', THB: '฿',
  MYR: 'RM', IDR: 'Rp', PHP: '₱', NZD: 'NZ$',
};

export interface CurrencyState {
  currency: string;
  symbol: string;
  rate: number;
  isLoading: boolean;
  error: string | null;
  format: (amount: number) => string;
  setCurrency: (currency: string) => void;
  availableCurrencies: string[];
}

// Session-level cache: { currency: rate }
const rateCache: Record<string, number> = {};

export function useCurrency(): CurrencyState {
  const [currency, setCurrencyState] = useState<string>('USD');
  const [rate, setRate] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([BASE_CURRENCY]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Fetch the exchange rate from USD → target currency
  const fetchRate = useCallback(async (targetCurrency: string) => {
    if (targetCurrency === BASE_CURRENCY) {
      setRate(1);
      setIsLoading(false);
      return;
    }

    // Check cache first
    if (rateCache[targetCurrency]) {
      setRate(rateCache[targetCurrency]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(
        `${API_URL}/currency/rates`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (!res.ok) throw new Error('Rate fetch failed');
      const data = await res.json();
      const fetchedRate = data.rates[targetCurrency];
      if (!fetchedRate) throw new Error('Currency not found');
      rateCache[targetCurrency] = fetchedRate;
      setRate(fetchedRate);
    } catch (err) {
      setError('Could not load exchange rate');
      setRate(1); // fallback to USD
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load available currencies from backend (cached)
  useEffect(() => {
    fetch(`${API_URL}/currency/rates`, { signal: AbortSignal.timeout(4000) })
      .then((r) => r.json())
      .then((data) => {
        const keys = Object.keys(data.rates || {});
        // Add USD since it's the base
        if (!keys.includes('USD')) keys.unshift('USD');
        setAvailableCurrencies(keys.sort());
      })
      .catch(() => {
        // Fallback: show common currencies
        setAvailableCurrencies(Object.keys(CURRENCY_SYMBOLS).sort());
      });
  }, []);

  // Auto-detect visitor's currency via backend IP detection
  useEffect(() => {
    const cached = sessionStorage.getItem('detected_currency');
    if (cached) {
      setCurrencyState(cached);
      fetchRate(cached);
      return;
    }

    fetch(`${API_URL}/currency/detect`, { 
      signal: AbortSignal.timeout(4000),
      credentials: 'include'
    })
      .then((r) => r.json())
      .then((data) => {
        const detected = data?.suggestedCurrency ?? 'USD';
        sessionStorage.setItem('detected_currency', detected);
        setCurrencyState(detected);
        fetchRate(detected);
      })
      .catch(() => {
        setIsLoading(false); // stay on USD
      });
  }, [fetchRate]);

  // Manual currency switcher
  const setCurrency = useCallback(
    (newCurrency: string) => {
      sessionStorage.setItem('detected_currency', newCurrency);
      setCurrencyState(newCurrency);
      fetchRate(newCurrency);
    },
    [fetchRate]
  );

  // Format a USD amount into the visitor's currency
  const format = useCallback(
    (amountUSD: number): string => {
      const converted = amountUSD * rate;
      const symbol = CURRENCY_SYMBOLS[currency] ?? currency;

      // Skip Intl on server to avoid hydration mismatch
      if (!mounted) return `${symbol}${converted.toFixed(2)}`;

      try {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
          minimumFractionDigits: currency === 'JPY' || currency === 'KRW' ? 0 : 2,
          maximumFractionDigits: currency === 'JPY' || currency === 'KRW' ? 0 : 2,
        }).format(converted);
      } catch {
        return `${symbol}${converted.toFixed(2)}`;
      }
    },
    [currency, rate, mounted]
  );

  return {
    currency,
    symbol: CURRENCY_SYMBOLS[currency] ?? currency,
    rate,
    isLoading,
    error,
    format,
    setCurrency,
    availableCurrencies,
  };
}
