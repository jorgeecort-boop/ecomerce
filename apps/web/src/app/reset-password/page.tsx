'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { API_URL } from '@ecomerce/utils';

function ResetForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (!token) {
      setError('Token de restablecimiento inválido');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al restablecer');
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <AlertCircle size={48} className="text-red-400 mx-auto" />
        <h1 className="text-xl font-bold text-white">Enlace inválido</h1>
        <p className="text-sm text-[rgba(255,255,255,0.6)]">Este enlace de restablecimiento no es válido.</p>
        <Link href="/forgot-password" className="inline-block text-sm text-[#00B4D8] hover:underline">
          Solicitar nuevo enlace
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <CheckCircle size={48} className="text-[#28A745] mx-auto" />
        <h1 className="text-xl font-bold text-white">Contraseña actualizada</h1>
        <p className="text-sm text-[rgba(255,255,255,0.6)]">Redirigiendo al inicio de sesión...</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-xl font-bold text-white mb-2">Nueva contraseña</h1>
      <p className="text-sm text-[rgba(255,255,255,0.5)] mb-6">Ingresa tu nueva contraseña.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-[rgba(255,255,255,0.6)] mb-1.5">Nueva contraseña</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.3)]" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              className="w-full py-2.5 pl-10 pr-4 rounded-xl bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] text-white text-sm placeholder:text-[rgba(255,255,255,0.3)] outline-none focus:border-[#00B4D8] transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-[rgba(255,255,255,0.6)] mb-1.5">Confirmar contraseña</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.3)]" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la contraseña"
              required
              className="w-full py-2.5 pl-10 pr-4 rounded-xl bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] text-white text-sm placeholder:text-[rgba(255,255,255,0.3)] outline-none focus:border-[#00B4D8] transition-colors"
            />
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-[#00B4D8] text-white text-sm font-semibold hover:bg-[#00B4D8]/90 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? 'Restableciendo...' : 'Restablecer contraseña'}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#03045E' }}>
      <div className="w-full max-w-md px-6">
        <div className="rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] p-8">
          <Suspense fallback={<div className="animate-spin w-6 h-6 border-2 border-[#00B4D8] border-t-transparent rounded-full mx-auto" />}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
