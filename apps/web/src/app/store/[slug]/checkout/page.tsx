'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useCurrency } from '@/hooks/useCurrency';
import { API_URL } from '@ecomerce/utils';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';

interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

interface CheckoutForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
  orderNotes: string;
}

const COUNTRIES = [
  'Colombia',
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Spain',
  'Italy',
  'Mexico',
  'Brazil',
  'Argentina',
  'Chile',
  'Peru',
  'Japan',
  'South Korea',
  'India',
  'Singapore',
  'Netherlands',
  'Sweden',
  'Norway',
  'Denmark',
  'Poland',
  'Portugal',
  'Belgium',
  'Switzerland',
];

const EMPTY_FORM: CheckoutForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  stateProvince: '',
  postalCode: '',
  country: 'Colombia',
  orderNotes: '',
};

function formatCurrency(amount: number, currency: string) {
  if (currency === 'COP') return `$${amount.toLocaleString('es-CO')}`;
  return `$${amount.toFixed(2)} ${currency}`;
}

export default function CheckoutPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const searchParams = useSearchParams();
  const { format, currency } = useCurrency('COP');

  const [step, setStep] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [form, setForm] = useState<CheckoutForm>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidatingShipping, setIsValidatingShipping] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{ orderId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponValidating, setCouponValidating] = useState(false);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

  useEffect(() => {
    const itemsParam = searchParams.get('items');
    if (itemsParam) {
      try {
        const parsed = JSON.parse(itemsParam) as CartItem[];
        setCart(
          Array.isArray(parsed)
            ? parsed.map((item) => ({ ...item, price: Number(item.price) }))
            : []
        );
      } catch (err) {
        console.error('Cart data parse error:', err, 'Items params:', itemsParam);
        setError('Invalid cart data. Please go back to the store.');
      }
    }
  }, [searchParams]);

  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/stores/slug/${slug}`, { signal: AbortSignal.timeout(8000) })
      .then((r) => r.json())
      .then((json) => {
        const data = json.data || json;
        if (data.id) setStoreId(data.id);
      })
      .catch(() => {});
  }, [slug]);

  useEffect(() => {
    const publicKey = (process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || '').trim();
    if (publicKey) initMercadoPago(publicKey, { locale: 'es-CO' });
  }, []);

  const validateCoupon = async () => {
    if (!couponCode.trim() || !storeId) return;

    setCouponValidating(true);
    setCouponMessage(null);
    setCouponDiscount(0);
    setAppliedCoupon(null);

    try {
      const res = await fetch(`${API_URL}/coupons/store/${storeId}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim(), orderTotal: subtotal }),
      });

      const json = await res.json();
      const data = json.data || json;

      if (data.valid) {
        setCouponDiscount(data.discountAmount);
        setAppliedCoupon(couponCode.trim());
        setCouponMessage(`¡Cupón aplicado! Ahorras ${format(data.discountAmount)}`);
      } else {
        setCouponMessage(data.message || 'Cupón inválido');
      }
    } catch {
      setCouponMessage('Error al validar el cupón');
    } finally {
      setCouponValidating(false);
    }
  };

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const FREE_SHIPPING_THRESHOLD = 200000;
  const FLAT_SHIPPING_COST = 19900;
  const shipping = subtotal > FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_COST;
  const tax = subtotal * 0.19;
  const total = subtotal + shipping + tax - couponDiscount;

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) {
      setCart((c) => c.filter((i) => i.id !== id));
      return;
    }
    setCart((c) => c.map((i) => (i.id === id ? { ...i, quantity: qty } : i)));
  };

  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsValidatingShipping(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/orders/validate-shipping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeSlug: slug,
          shippingAddress: form,
        }),
      });

      if (!response.ok) {
        const payload = await response
          .json()
          .catch(() => ({ message: 'Failed to validate shipping information' }));
        setError(payload.message || 'Failed to validate shipping information');
        return;
      }

      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError('Failed to validate shipping information. Please try again.');
    } finally {
      setIsValidatingShipping(false);
    }
  };

  const handleShippingToPayment = () => {
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBrickSubmit = async (brickFormData: any) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/payments/process-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeSlug: slug,
          items: cart.map((i) => ({
            productId: i.id,
            title: i.title,
            price: Number(i.price),
            quantity: i.quantity,
          })),
          customerEmail: form.email,
          customerPhone: form.phone,
          shippingAddress: {
            name: `${form.firstName} ${form.lastName}`,
            address: form.address,
            city: form.city,
            state: form.stateProvince,
            postalCode: form.postalCode,
            country: form.country,
            phone: form.phone,
          },
          subtotal,
          shippingCost: shipping,
          tax,
          total,
          currency: 'COP',
          cardToken: brickFormData.formData?.token,
          paymentMethodId: brickFormData.formData?.payment_method_id,
          installments: brickFormData.formData?.installments || 1,
          issuerId: brickFormData.formData?.issuer_id,
          formData: brickFormData.formData,
          identificationNumber:
            brickFormData.formData?.payer?.identification?.number ||
            '0000000000',
          ...(appliedCoupon && { couponCode: appliedCoupon }),
          ...(form.orderNotes.trim() && { notes: form.orderNotes.trim() }),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Error al procesar el pago');
        setIsSubmitting(false);
        return;
      }

      const result = data.data || data;

      if (result.status === 'approved') {
        window.location.href = `/store/${slug}/checkout/success?orderNumber=${result.orderNumber}`;
      } else if (result.status === 'rejected') {
        window.location.href = `/store/${slug}/checkout/failure?orderNumber=${result.orderNumber}&status_detail=${result.statusDetail || ''}`;
      } else {
        window.location.href = `/store/${slug}/checkout/pending?orderNumber=${result.orderNumber}`;
      }
    } catch {
      setError('Failed to process payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 2 && orderSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 transition-colors">
        <div className="max-w-md w-full text-center">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 transition-colors">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Order Confirmed!
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Thank you, {form.firstName}! Your order has been placed.
            </p>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-6 text-left">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Order ID</p>
              <p className="font-mono font-bold text-gray-900 dark:text-white text-sm">
                {orderSuccess.orderId}
              </p>
              <hr className="my-3 border-gray-200 dark:border-gray-600" />
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Confirmation sent to</p>
              <p className="text-sm text-gray-900 dark:text-white">{form.email}</p>
              <hr className="my-3 border-gray-200 dark:border-gray-600" />
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total charged</p>
              <p className="font-bold text-gray-900 dark:text-white">{format(total)}</p>
            </div>
            <div className="flex gap-3">
              <Link
                href={`/store/${slug}`}
                className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-center"
              >
                Continue Shopping
              </Link>
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 transition-colors"
              >
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 shadow-sm transition-colors">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href={`/store/${slug}`}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            ← Back to Store
          </Link>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Checkout</h1>
          <span className="text-sm text-gray-400">{cart.length} items</span>
        </div>
      </header>

      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center gap-0">
            {['Cart Review', 'Shipping', 'Payment'].map((label, i) => (
              <div key={label} className="flex items-center">
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    step === 1
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      : step > 1
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      step > 1
                        ? 'bg-green-500 text-white'
                        : step === 1
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                    }`}
                  >
                    {step > 1 ? '✓' : i + 1}
                  </span>
                  {label}
                </div>
                {i < 2 && <span className="text-gray-300 dark:text-gray-600 mx-1">›</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-400">
              ⚠️ {error}
            </div>
          )}

          {step === 1 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors">
              <h2 className="font-bold text-gray-900 dark:text-white text-lg mb-5">
                Review Your Order
              </h2>

              {cart.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-4xl mb-2">🛒</p>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">Your cart is empty</p>
                  <Link
                    href={`/store/${slug}`}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                  >
                    Go to Store
                  </Link>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    {cart.map((item) => (
                      <div key={item.id} className="flex gap-4 items-start">
                        <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden flex-shrink-0 relative">
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.title}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">
                              📦
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                            {item.title}
                          </p>
                          <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold mt-1">
                            {format(item.price)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => updateQty(item.id, item.quantity - 1)}
                            className="w-7 h-7 rounded-lg border dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-sm"
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-sm text-gray-900 dark:text-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQty(item.id, item.quantity + 1)}
                            className="w-7 h-7 rounded-lg border dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-sm"
                          >
                            +
                          </button>
                        </div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white flex-shrink-0 min-w-[60px] text-right">
                          {format(item.price * item.quantity)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setStep(2)}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                  >
                    Continue to Shipping →
                  </button>
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <form
              onSubmit={handleShippingSubmit}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors"
            >
              <h2 className="font-bold text-gray-900 dark:text-white text-lg mb-5">
                Shipping Information
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="checkout-firstName" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    First Name *
                  </label>
                  <input
                    id="checkout-firstName"
                    name="firstName"
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-lastName" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Name *
                  </label>
                  <input
                    id="checkout-lastName"
                    name="lastName"
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Doe"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-email" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email *
                  </label>
                  <input
                    id="checkout-email"
                    name="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-phone" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    id="checkout-phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+57 300 000 0000"
                  />
                </div>
                <div className="col-span-2">
                  <label htmlFor="checkout-address" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Street Address *
                  </label>
                  <input
                    id="checkout-address"
                    name="address"
                    required
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Calle 123 #45-67"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-city" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    City *
                  </label>
                  <input
                    id="checkout-city"
                    name="city"
                    required
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Cali"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-stateProvince" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    State / Province
                  </label>
                  <input
                    id="checkout-stateProvince"
                    name="stateProvince"
                    value={form.stateProvince}
                    onChange={(e) => setForm({ ...form, stateProvince: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Valle del Cauca"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-postalCode" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Postal Code *
                  </label>
                  <input
                    id="checkout-postalCode"
                    name="postalCode"
                    required
                    value={form.postalCode}
                    onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="760001"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-country" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Country *
                  </label>
                  <select
                    id="checkout-country"
                    name="country"
                    required
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label htmlFor="checkout-orderNotes" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notas del pedido (opcional)
                  </label>
                  <textarea
                    id="checkout-orderNotes"
                    name="orderNotes"
                    value={form.orderNotes}
                    onChange={(e) => setForm({ ...form, orderNotes: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={2}
                    placeholder="Ej: Entregar en portería, llamar antes de llegar..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                >
                  Continue to Payment →
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 transition-colors">
              <h2 className="font-bold text-gray-900 dark:text-white text-lg mb-5">Payment</h2>

              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg text-sm text-green-700 dark:text-green-400">
                Pago seguro con MercadoPago. Tarjetas, PSE, Nequi, Daviplata, Efecty y más.
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              {isSubmitting ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    Procesando pago...
                  </p>
                </div>
              ) : (
                <div id="payment-brick-container">
                  <Payment
                    initialization={{
                      amount: Math.round(total),
                      payer: {
                        email: form.email,
                        firstName: form.firstName,
                        lastName: form.lastName,
                      },
                    }}
                    customization={{
                      visual: { style: { theme: 'bootstrap' } },
                      paymentMethods: {
                        creditCard: 'all' as const,
                        ticket: 'all' as const,
                        maxInstallments: 12,
                      },
                    }}
                    onSubmit={handleBrickSubmit}
                    locale="es-CO"
                  />
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => { setStep(2); setError(null); }}
                  className="px-5 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  ← Back
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-gray-400 dark:text-gray-500 text-xs">
                <span>💳 Visa</span>
                <span>💳 Mastercard</span>
                <span>🏦 PSE</span>
                <span>📱 Nequi</span>
                <span>📱 Daviplata</span>
                <span>💵 Efecty</span>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 sticky top-24 transition-colors">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Order Summary</h3>

            <div className="space-y-2 mb-4">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 line-clamp-1 flex-1 mr-2">
                    {item.title} ×{item.quantity}
                  </span>
                  <span className="text-gray-900 dark:text-white font-medium flex-shrink-0">
                    {format(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t dark:border-gray-700 pt-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    if (appliedCoupon) {
                      setAppliedCoupon(null);
                      setCouponDiscount(0);
                      setCouponMessage(null);
                    }
                  }}
                  placeholder="Código de descuento"
                  className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-xs bg-white dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!!appliedCoupon}
                />
                <button
                  type="button"
                  onClick={validateCoupon}
                  disabled={couponValidating || !couponCode.trim() || !!appliedCoupon}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                >
                  {couponValidating ? '...' : appliedCoupon ? '✓' : 'Aplicar'}
                </button>
              </div>
              {couponMessage && (
                <p
                  className={`text-xs mt-2 ${
                    appliedCoupon
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-500 dark:text-red-400'
                  }`}
                >
                  {couponMessage}
                </p>
              )}
            </div>

            <div className="border-t dark:border-gray-700 pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                <span className="text-gray-900 dark:text-white">{format(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Shipping</span>
                <span
                  className={
                    shipping === 0
                      ? 'text-green-600 dark:text-green-400 font-medium'
                      : 'text-gray-900 dark:text-white'
                  }
                >
                  {shipping === 0 ? 'Gratis 🎉' : format(shipping)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Tax (19%)</span>
                <span className="text-gray-900 dark:text-white">{format(tax)}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600 dark:text-green-400">Descuento</span>
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    −{format(couponDiscount)}
                  </span>
                </div>
              )}
            </div>

            <div className="border-t dark:border-gray-700 pt-3 mt-3 flex justify-between items-center">
              <span className="font-bold text-gray-900 dark:text-white">Total</span>
              <div className="text-right">
                <p className="font-bold text-lg text-gray-900 dark:text-white">{format(total)}</p>
                <p className="text-xs text-gray-400">{currency}</p>
              </div>
            </div>

            {step >= 2 && form.city && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-300">
                <p className="font-medium mb-1">Shipping to:</p>
                <p>
                  {form.firstName} {form.lastName}
                </p>
                <p>{form.address}</p>
                <p>
                  {form.city}, {form.stateProvince} {form.postalCode}
                </p>
                <p>{form.country}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
