'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

// Client-side quick format check before hitting the backend
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Known disposable domains (lightweight client-side check as first filter)
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
  'dispostable.com', 'yopmail.com', '10minutemail.com', 'trashmail.com',
  'sharklasers.com', 'spam4.me', 'fakeinbox.com', 'maildrop.cc',
]);

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailWarning, setEmailWarning] = useState('');
  const { register } = useAuth();
  const router = useRouter();

  // Instant client-side email check on blur (before submitting)
  const handleEmailBlur = useCallback(() => {
    setEmailWarning('');
    if (!email) return;
    if (!EMAIL_RE.test(email)) {
      setEmailWarning('Please enter a valid email address');
      return;
    }
    const domain = email.split('@')[1]?.toLowerCase();
    if (DISPOSABLE_DOMAINS.has(domain)) {
      setEmailWarning('Disposable email addresses are not allowed');
    }
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Block locally-caught disposables before even hitting API
    const domain = email.split('@')[1]?.toLowerCase();
    if (DISPOSABLE_DOMAINS.has(domain)) {
      setError('Disposable or temporary email addresses are not allowed. Please use your real email.');
      setLoading(false);
      return;
    }

    try {
      await register(email, password, name);
      router.push('/dashboard');
    } catch (err: any) {
      // Relay the backend error message (EVA + Disify validation or conflict)
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = (() => {
    if (password.length === 0) return null;
    if (password.length < 8) return { label: 'Too short', color: 'bg-red-400', width: '25%' };
    if (password.length < 12 && !/[^a-zA-Z0-9]/.test(password)) return { label: 'Fair', color: 'bg-yellow-400', width: '50%' };
    if (password.length >= 12 && /[^a-zA-Z0-9]/.test(password)) return { label: 'Strong', color: 'bg-green-400', width: '100%' };
    return { label: 'Good', color: 'bg-blue-400', width: '75%' };
  })();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-md w-full px-6 py-8 bg-white dark:bg-gray-800 rounded-xl shadow-md transition-colors">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400">Ecomerce</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Global error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-start gap-2">
              <span className="flex-shrink-0 mt-0.5">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              placeholder="John Doe"
              required
            />
          </div>

          {/* Email — validated on blur via client-side + backend EVA/Disify */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailWarning(''); }}
              onBlur={handleEmailBlur}
              className={`w-full px-4 py-2.5 border rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-colors ${
                emailWarning
                  ? 'border-red-400 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600 focus:border-blue-500'
              }`}
              placeholder="you@example.com"
              required
            />
            {emailWarning && (
              <p className="mt-1 text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
                <span>⚠️</span> {emailWarning}
              </p>
            )}
            {!emailWarning && email && EMAIL_RE.test(email) && (
              <p className="mt-1 text-xs text-green-500 dark:text-green-400 flex items-center gap-1">
                <span>✓</span> Valid email
              </p>
            )}
          </div>

          {/* Password with strength meter */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              placeholder="••••••••"
              minLength={8}
              required
            />
            {/* Password strength bar */}
            {passwordStrength && (
              <div className="mt-2">
                <div className="h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color}`}
                    style={{ width: passwordStrength.width }}
                  />
                </div>
                <p className={`text-xs mt-1 ${
                  passwordStrength.label === 'Strong' ? 'text-green-500' :
                  passwordStrength.label === 'Good' ? 'text-blue-500' :
                  passwordStrength.label === 'Fair' ? 'text-yellow-500' : 'text-red-500'
                }`}>
                  {passwordStrength.label}
                </p>
              </div>
            )}
            {!passwordStrength && (
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Minimum 8 characters</p>
            )}
          </div>

          <button
            id="register-submit"
            type="submit"
            disabled={loading || !!emailWarning}
            className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors text-sm"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Verifying email & creating account...
              </span>
            ) : (
              'Create Account'
            )}
          </button>

          <p className="text-xs text-center text-gray-400 dark:text-gray-500">
            By registering, your email is verified for deliverability and disposable addresses are blocked.
          </p>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
