import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, Loader2, AlertCircle, ShieldCheck, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { UserRole } from '../types/index';
import { BAALLogo } from '../components/BAALLogo';

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [twoFAStep, setTwoFAStep] = useState<'credentials' | 'code'>('credentials');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await api.auth.login(email, password, {
        code: twoFACode ? twoFACode.replace(/\D/g, '').slice(0, 6) : undefined,
        recoveryCode: recoveryCode.trim() || undefined,
      });

      if (data?.requires2FA) {
        setRequires2FA(true);
        setTwoFAStep('code');
        return;
      }

      if (data && data.user && data.user.role === UserRole.ADMIN) {
        setRequires2FA(false);
        setTwoFACode('');
        setRecoveryCode('');
        onLogin();
      } else {
        setError('Acesso negado. Usuário não é administrador.');
        api.auth.logout();
      }
    } catch (err: any) {
      const errMsg = err.message || 'Falha ao realizar login.';
      setError(errMsg);
      
      // Se foi erro de 2FA mas o usuário não estava na tela de 2FA ainda
      if (errMsg.includes('2FA') && !requires2FA) {
        // Retornar para a tela de credenciais
        setTwoFAStep('credentials');
        setRequires2FA(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setRequires2FA(false);
    setTwoFAStep('credentials');
    setTwoFACode('');
    setRecoveryCode('');
    setError('');
  };

  return (
    <div className="min-h-screen w-full flex bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 font-sans overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-baal-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-32 w-64 h-64 bg-red-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-baal-600/5 rounded-full blur-3xl" />
      </div>

      {/* Left side - Branding */}
      <div className="hidden lg:flex w-1/2 relative flex-col justify-between items-start p-12 z-10">
        <div className="flex items-center gap-3">
          <BAALLogo size="lg" />
          <span className="text-2xl font-bold tracking-tight text-white uppercase">Baal Admin</span>
        </div>

        <div className="max-w-md">
          <h1 className="text-5xl font-bold mb-6 leading-tight text-white">
            Gestão Financeira <span className="text-transparent bg-clip-text bg-gradient-to-r from-baal-300 to-red-300">Inteligente</span>
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed">
            Painel administrativo seguro. Gerencie clientes, transações e operações com total controle e transparência.
          </p>
        </div>

        <div className="text-slate-400 text-sm">
          <p>© 2024–2026 BAAL. Todos os direitos reservados.</p>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-8 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <BAALLogo size="lg" />
          </div>

          {/* Form Container */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 space-y-6 border border-white/20">
            {/* Header */}
            <div>
              <h2 className="text-3xl font-bold text-slate-900">
                {requires2FA ? 'Autenticação 2FA' : 'Login Admin'}
              </h2>
              <p className="mt-2 text-slate-600">
                {requires2FA 
                  ? 'Insira o código do seu authenticador' 
                  : 'Acesso restrito a administradores'}
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className={`p-4 rounded-lg flex items-center gap-3 border ${
                requires2FA 
                  ? 'bg-red-50 border-red-200 text-red-700' 
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email & Password Fields */}
              <div className={`space-y-5 transition-all duration-300 ${requires2FA ? 'opacity-50 pointer-events-none' : ''}`}>
                {/* Email Field */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 ml-0.5">Email</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-baal-600 transition-colors duration-200">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={requires2FA}
                      placeholder="admin@baalbank.com"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-baal-500/30 focus:border-baal-500 focus:bg-white outline-none transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 ml-0.5">Senha</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-baal-600 transition-colors duration-200">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={requires2FA}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-baal-500/30 focus:border-baal-500 focus:bg-white outline-none transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={requires2FA}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* 2FA Code Fields */}
              {requires2FA && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  {/* TOTP Code */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 ml-0.5">Código TOTP</label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-600 transition-colors duration-200">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        value={twoFACode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setTwoFACode(val);
                        }}
                        autoFocus
                        placeholder="000000"
                        maxLength="6"
                        className="w-full pl-12 pr-4 py-3.5 text-center text-2xl font-semibold tracking-widest bg-cyan-50 border border-cyan-200 rounded-lg focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 focus:bg-white outline-none transition-all shadow-sm"
                      />
                    </div>
                    <p className="text-xs text-slate-500 ml-0.5">Ou use seu recovery code abaixo</p>
                  </div>

                  {/* Recovery Code */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 ml-0.5">Recovery Code (opcional)</label>
                    <input
                      type="text"
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value)}
                      placeholder="Ex: ABC123-XYZ789"
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 focus:bg-white outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || (requires2FA && !twoFACode && !recoveryCode)}
                className="w-full bg-gradient-to-r from-baal-600 to-red-600 hover:from-baal-700 hover:to-red-700 text-white py-3.5 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg hover:shadow-xl active:scale-95"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processando...</span>
                  </>
                ) : requires2FA ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Verificar Código</span>
                  </>
                ) : (
                  <>
                    <span>Entrar</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              {/* Back Button */}
              {requires2FA && (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={loading}
                  className="w-full py-2.5 text-slate-600 hover:text-slate-900 font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  ← Voltar para credenciais
                </button>
              )}
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-slate-400 text-xs mt-6">
            Painel administrativo seguro • Protegido pelas melhores tecnologias
          </p>
        </div>
      </div>
    </div>
  );
};
