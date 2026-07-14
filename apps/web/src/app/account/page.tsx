'use client';

import { useAuth } from '@/contexts/auth-context';
import { User, Mail, Calendar } from 'lucide-react';

export default function AccountPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Mi Perfil</h1>
        <p className="text-[rgba(255,255,255,0.5)] text-sm mt-1">
          Información de tu cuenta
        </p>
      </div>

      <div className="rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#a8adb8] to-[#0a0a0f] flex items-center justify-center">
            <User size={28} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{user.name || 'Usuario'}</h2>
            <p className="text-sm text-[rgba(255,255,255,0.5)]">Cliente</p>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)]">
            <Mail size={18} className="text-[#a8adb8]" />
            <div>
              <p className="text-xs text-[rgba(255,255,255,0.4)]">Email</p>
              <p className="text-sm text-white">{user.email}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
