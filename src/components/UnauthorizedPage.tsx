/**
 * UnauthorizedPage — Shown when the user's email is not in the whitelist
 */
import React from 'react';
import { ShieldX } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function UnauthorizedPage() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-[#faf6ee] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-red-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[#203723]/6 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm text-center">
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-red-100 border-2 border-red-200 mx-auto mb-6 flex items-center justify-center shadow-lg">
          <ShieldX className="w-10 h-10 text-red-500" />
        </div>

        {/* Main message */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3 leading-tight">
          Você não pertence a essa organização
        </h1>

        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          Este sistema é de uso exclusivo da equipe autorizada The Parlor. 
          Entre em contato com o administrador para solicitar acesso.
        </p>

        {/* Back button */}
        <button
          onClick={signOut}
          className="inline-flex items-center gap-2 bg-[#203723] hover:bg-[#203723]/90 text-white font-semibold text-sm px-8 py-3 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
        >
          Voltar
        </button>

        {/* Brand footer */}
        <div className="mt-10 pt-6 border-t border-gray-200">
          <p className="font-brand font-bold text-xs tracking-widest text-[#C19848] uppercase">The Parlor</p>
          <p className="font-brand italic text-[10px] text-gray-400 mt-0.5">Fluxo de Caixa</p>
        </div>
      </div>
    </div>
  );
}
