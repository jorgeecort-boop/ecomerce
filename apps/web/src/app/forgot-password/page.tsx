'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { API_URL } from '@ecomerce/utils';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al enviar');
      setSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="w-full max-w-md px-6">
        <div className="rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <CheckCircle size={48} className="text-[#a8adb8] mx-auto" />
              <h1 className="text-xl font-bold text-white">Revisa tu email</h1>
              <p className="text-sm text-[rgba(255,255,255,0.6)]">
                Si existe una cuenta con {email}, recibirás instrucciones para restablecer tu contraseña.
              </p>
              <Link href="/login" className="inline-block text-sm text-[#a8adb8] hover:underline mt-4">
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-[rgba(255,255,255,0.5)] hover:text-white mb-6 transition-colors">
                <ArrowLeft size={14} />
                Volver
              </Link>

              <h1 className="text-xl font-bold text-white mb-2">¿Olvidaste tu contraseña?</h1>
              <p className="text-sm text-[rgba(255,255,255,0.5)] mb-6">
                Ingresa tu email y te enviaremos instrucciones para restablecerla.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-[rgba(255,255,255,0.6)] mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.3)]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      required
                      className="w-full py-2.5 pl-10 pr-4 rounded-xl bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] text-white text-sm placeholder:text-[rgba(255,255,255,0.3)] outline-none focus:border-[#a8adb8] transition-colors"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-red-400 text-sm">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-[#a8adb8] text-white text-sm font-semibold hover:bg-[#a8adb8]/90 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? 'Enviando...' : 'Enviar instrucciones'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
