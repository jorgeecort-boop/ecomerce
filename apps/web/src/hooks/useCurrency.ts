/**
 * useCurrency hook
 *
 * Features:
 * - Auto-detects visitor's currency via backend IP detection (cached)
 * - Fetches exchange rate from USD (the store's base currency)
 * - Supports store-level base currency via `storeCurrency` param
 * - If store currency matches visitor currency, no conversion is applied
 * - Formats prices in the visitor's local currency
 * - Caches the rate in sessionStorage to avoid repeated API calls
 */

import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '@ecomerce/utils';

const DEFAULT_BASE_CURRENCY = 'USD';

// Supported currencies with symbols
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
  CHF: 'CHF',
  CNY: '¥',
  MXN: 'MX$',
  BRL: 'R$',
  INR: '₹',
  KRW: '₩',
  SGD: 'S$',
  HKD: 'HK$',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  PLN: 'zł',
  CZK: 'Kč',
  HUF: 'Ft',
  RON: 'lei',
  BGN: 'лв',
  HRK: 'kn',
  ISK: 'kr',
  TRY: '₺',
  RUB: '₽',
  ZAR: 'R',
  AED: 'د.إ',
  SAR: '﷼',
  CLP: 'CLP$',
  COP: 'COP$',
  ARS: 'ARS$',
  PEN: 'S/',
  VND: '₫',
  THB: '฿',
  MYR: 'RM',
  IDR: 'Rp',
  PHP: '₱',
  NZD: 'NZ$',
};

const COP_LOCALE: Record<string, string> = {
  COP: 'es-CO',
  ARS: 'es-AR',
  MXN: 'es-MX',
  CLP: 'es-CL',
  PEN: 'es-PE',
  BRL: 'pt-BR',
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

export function useCurrency(storeCurrency?: string): CurrencyState {
  const baseCurrency = storeCurrency || DEFAULT_BASE_CURRENCY;
  const [currency, setCurrencyState] = useState<string>(baseCurrency);
  const [rate, setRate] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([baseCurrency]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch the exchange rate from baseCurrency → target currency
  const fetchRate = useCallback(async (targetCurrency: string) => {
    if (targetCurrency === baseCurrency) {
      setRate(1);
      setIsLoading(false);
      return;
    }

    // Check cache first
    const cacheKey = `${baseCurrency}:${targetCurrency}`;
    if (rateCache[cacheKey]) {
      setRate(rateCache[cacheKey]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/currency/rates`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error('Rate fetch failed');
      const json = await res.json();
      const data = json.data || json;

      let fetchedRate: number;

      if (baseCurrency === 'USD') {
        fetchedRate = data.rates?.[targetCurrency];
      } else {
        const baseToUsd = data.rates?.[baseCurrency];
        const usdToTarget = data.rates?.[targetCurrency];
        if (!baseToUsd || !usdToTarget) throw new Error('Currency not found');
        fetchedRate = usdToTarget / baseToUsd;
      }

      if (!fetchedRate) throw new Error('Currency not found');
      rateCache[cacheKey] = fetchedRate;
      setRate(fetchedRate);
    } catch (err) {
      setError('Could not load exchange rate');
      setRate(1);
    } finally {
      setIsLoading(false);
    }
  }, [baseCurrency]);

  // Load available currencies from backend (cached)
  useEffect(() => {
    fetch(`${API_URL}/currency/rates`, { signal: AbortSignal.timeout(4000) })
      .then((r) => r.json())
      .then((json) => {
        const data = json.data || json;
        const keys = Object.keys(data.rates || {});
        if (!keys.includes('USD')) keys.unshift('USD');
        if (!keys.includes(baseCurrency)) keys.unshift(baseCurrency);
        setAvailableCurrencies(keys.sort());
      })
      .catch(() => {
        setAvailableCurrencies(Object.keys(CURRENCY_SYMBOLS).sort());
      });
  }, [baseCurrency]);

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
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((json) => {
        const data = json.data || json;
        const detected = data?.suggestedCurrency ?? baseCurrency;
        sessionStorage.setItem('detected_currency', detected);
        setCurrencyState(detected);
        fetchRate(detected);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, [fetchRate, baseCurrency]);

  // Manual currency switcher
  const setCurrency = useCallback(
    (newCurrency: string) => {
      sessionStorage.setItem('detected_currency', newCurrency);
      setCurrencyState(newCurrency);
      fetchRate(newCurrency);
    },
    [fetchRate]
  );

  // Format an amount in the store's base currency into the visitor's currency
  const format = useCallback(
    (amount: number): string => {
      const converted = amount * rate;
      const symbol = CURRENCY_SYMBOLS[currency] ?? currency;

      if (!mounted) return `${symbol}${converted.toFixed(2)}`;

      try {
        const locale = COP_LOCALE[currency] || 'en-US';
        const minDigits = currency === 'JPY' || currency === 'KRW' ? 0 : (currency === 'COP' ? 0 : 2);
        const maxDigits = currency === 'JPY' || currency === 'KRW' ? 0 : (currency === 'COP' ? 0 : 2);

        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency,
          minimumFractionDigits: minDigits,
          maximumFractionDigits: maxDigits,
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
