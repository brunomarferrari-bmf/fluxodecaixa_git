/**
 * LoginPage — Full-screen authentication gate for The Parlor
 *
 * Autenticação: Google OAuth (Google confirma identidade)
 * Autorização:  check_and_authorize_user() RPC no banco decide se pode entrar
 *
 * O frontend nunca decide autorização. Apenas inicia o fluxo OAuth
 * e exibe o resultado retornado pelo AuthContext.
 */
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, ArrowLeft, ShieldAlert } from 'lucide-react';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

// Contas Chrome pré-configuradas (disparam Google OAuth com login_hint)
const CHROME_ACCOUNTS = [
  { name: 'Bruno Ferrari',  email: 'brunomartinsferrari@gmail.com', avatar: 'BF' },
  { name: 'The Parlor SP',  email: 'theparlorsp@gmail.com',         avatar: 'TP' },
];

export function LoginPage() {
  const { signInWithGoogle } = useAuth();

  const [view, setView]                   = useState<'login' | 'select-account'>('login');
  const [loading, setLoading]             = useState(false);
  const [customEmail, setCustomEmail]     = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Extract OAuth error from URL (query or hash)
  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const oauthError =
    urlParams.get('error_description') ||
    hashParams.get('error_description') ||
    urlParams.get('error') ||
    hashParams.get('error');

  const handleStartLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      setLoading(false);
    }
  };

  /**
   * Inicia o fluxo Google OAuth real.
   * `login_hint` pré-seleciona a conta no Google se o usuário já estiver logado no Chrome.
   * A autorização é decidida pelo banco após o retorno do OAuth — nunca aqui.
   */
  const handleSelectAccount = async (email: string) => {
    setLoading(true);
    await signInWithGoogle(email);
    // O browser redireciona para o Google. Quando voltar,
    // onAuthStateChange no AuthContext chama check_and_authorize_user().
    // Se não autorizado, status fica 'unauthorized' e App.tsx exibe UnauthorizedPage.
  };

  const handleCustomEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) return;
    handleSelectAccount(customEmail.trim().toLowerCase());
  };

  return (
    <div className="min-h-screen bg-[#faf6ee] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#C19848]/8 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[#203723]/6 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#C19848]/4 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">

        {/* VIEW 1: LANDING */}
        {view === 'login' && (
          <div className="animate-fade-in space-y-4">
            <div className="bg-[#203723] rounded-2xl p-8 shadow-2xl border border-[#C19848]/20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#C19848] mx-auto mb-5 flex items-center justify-center shadow-lg">
                <svg viewBox="0 0 40 40" className="w-9 h-9 fill-[#203723]" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 4C11.163 4 4 11.163 4 20s7.163 16 16 16 16-7.163 16-16S28.837 4 20 4zm0 4c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3zm7 18H13v-2c0-3.314 3.134-6 7-6s7 2.686 7 6v2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold tracking-[0.12em] text-[#C19848] uppercase font-brand leading-none mb-1">
                The Parlor
              </h1>
              <p className="text-[12px] text-[#E4D8BE]/80 font-brand italic tracking-widest">
                Fluxo de Caixa
              </p>
              <div className="mt-6 pt-6 border-t border-[#C19848]/15">
                <p className="text-xs text-gray-400 leading-relaxed">
                  Plataforma exclusiva de gestão financeira.<br />
                  Faça login com sua conta Google autorizada do Chrome.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
              <h2 className="text-sm font-bold text-gray-900 text-center mb-5">
                Acesso à Plataforma
              </h2>

              {oauthError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-xs font-semibold flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>Erro no Google OAuth: {decodeURIComponent(oauthError)}</span>
                </div>
              )}
              <button
                onClick={handleStartLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 font-semibold text-sm px-5 py-3 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading
                  ? <span className="w-5 h-5 border-2 border-gray-300 border-t-[#4285F4] rounded-full animate-spin" />
                  : <GoogleIcon />
                }
                <span>Continuar com Google</span>
              </button>
              <p className="text-[10px] text-gray-400 text-center mt-4 leading-relaxed">
                Apenas contas autorizadas têm acesso a esta plataforma.
              </p>
            </div>
          </div>
        )}

        {/* VIEW 2: SELEÇÃO DE CONTA (estilo Chrome) */}
        {view === 'select-account' && (
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <div className="flex items-center gap-2">
                <GoogleIcon />
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Fazer login com o Google
                </span>
              </div>
              <button
                onClick={() => setView('login')}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                title="Voltar"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>

            <h3 className="text-base font-bold text-gray-900 mb-1">Escolha uma conta</h3>
            <p className="text-xs text-gray-500 mb-5">para continuar no sistema The Parlor</p>

            {/* Loading ao redirecionar para o Google */}
            {loading && (
              <div className="flex items-center justify-center gap-2 py-3 mb-4 bg-[#faf6ee] rounded-xl border border-[#C19848]/20">
                <span className="w-4 h-4 border-2 border-[#C19848]/30 border-t-[#C19848] rounded-full animate-spin" />
                <span className="text-xs text-gray-500 font-medium">Redirecionando para o Google...</span>
              </div>
            )}

            {/* Lista de contas */}
            <div className="space-y-2">
              {CHROME_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => handleSelectAccount(acc.email)}
                  disabled={loading}
                  className="w-full flex items-center gap-3.5 p-3 rounded-xl hover:bg-gray-50 active:bg-gray-100/70 border border-transparent hover:border-gray-200 transition-all text-left cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-10 h-10 rounded-full bg-[#203723] text-[#C19848] font-bold flex items-center justify-center text-sm shadow-inner group-hover:scale-105 transition-transform">
                    {acc.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800 group-hover:text-gray-900 transition-colors">
                      {acc.name}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate">{acc.email}</p>
                  </div>
                </button>
              ))}

              {/* Usar outra conta */}
              {!showCustomInput ? (
                <button
                  onClick={() => setShowCustomInput(true)}
                  disabled={loading}
                  className="w-full text-center py-3 text-xs font-semibold text-[#C19848] hover:text-[#C19848]/90 transition-colors mt-2 disabled:opacity-50"
                >
                  Usar outra conta
                </button>
              ) : (
                <form onSubmit={handleCustomEmailSubmit} className="pt-3 border-t border-gray-100 mt-3 space-y-2">
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Inserir outro e-mail
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="email"
                        required
                        placeholder="nome@exemplo.com"
                        value={customEmail}
                        onChange={(e) => setCustomEmail(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C19848]/20 focus:border-[#C19848] font-medium"
                      />
                      <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-[#203723] hover:bg-[#203723]/90 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Avançar
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCustomInput(false)}
                    className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors block mx-auto pt-1"
                  >
                    Cancelar
                  </button>
                </form>
              )}
            </div>

            {/* Nota de segurança */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-start gap-2 text-[10px] text-gray-400 leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C19848] shrink-0 mt-1" />
              <p>
                O Google compartilhará seu nome, e-mail e foto com a plataforma The Parlor.
                Apenas contas previamente autorizadas terão acesso.
              </p>
            </div>
          </div>
        )}

        <p className="text-center text-[11px] text-gray-400 mt-5">
          © 2026 The Parlor · Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
