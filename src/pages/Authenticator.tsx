import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Copy, QrCode, RefreshCcw, ShieldCheck } from 'lucide-react';
import { twoFactorService } from '../services/twoFactor.service';

export const Authenticator: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  const refreshStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const status = await twoFactorService.status();
      setEnabled(Boolean(status?.enabled));
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar status do authenticator.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const startSetup = async () => {
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    try {
      const res = await twoFactorService.setup();
      setQrCode(res.qrCode);
      setSecret(res.secret);
      setSuccess('Configuração iniciada. Escaneie o QR e confirme com o código de 6 dígitos.');
    } catch (e: any) {
      setError(e?.message || 'Falha ao iniciar configuração do authenticator.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const enable2FA = async () => {
    const cleanCode = code.replace(/\D/g, '').slice(0, 6);
    if (cleanCode.length !== 6) {
      setError('Informe um código TOTP válido de 6 dígitos.');
      return;
    }
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    try {
      const res = await twoFactorService.enable(cleanCode);
      setEnabled(true);
      setRecoveryCodes(res.recoveryCodes || []);
      setQrCode(null);
      setSecret(null);
      setCode('');
      setSuccess('Authenticator ativado com sucesso.');
    } catch (e: any) {
      setError(e?.message || 'Falha ao ativar authenticator.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const regenerateRecoveryCodes = async () => {
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    try {
      const cleanCode = code.replace(/\D/g, '').slice(0, 6);
      const res = await twoFactorService.generateRecoveryCodes({
        code: cleanCode || undefined,
        recoveryCode: recoveryCode.trim() || undefined,
      });
      setRecoveryCodes(res.recoveryCodes || []);
      setSuccess('Novos códigos de recuperação gerados com sucesso.');
    } catch (e: any) {
      setError(e?.message || 'Falha ao gerar novos códigos de recuperação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-slate-500">Carregando authenticator...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-red-600" />
          Authenticator (2FA)
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Proteja o acesso do admin e de subcontas level2 com código TOTP e códigos de recuperação.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {success}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Status</p>
            <p className="text-lg font-bold text-slate-900">{enabled ? 'Ativado' : 'Desativado'}</p>
          </div>
          <button
            onClick={refreshStatus}
            disabled={isSubmitting}
            className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium flex items-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" /> Atualizar
          </button>
        </div>
      </div>

      {!enabled && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <button
            onClick={startSetup}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold flex items-center gap-2"
          >
            <QrCode className="w-4 h-4" /> Iniciar configuração
          </button>

          {qrCode && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <img src={qrCode} alt="QR Code 2FA" className="w-64 h-64 border border-slate-200 rounded-xl" />
              </div>
              {secret && (
                <div className="text-center text-sm text-slate-600">
                  <span className="font-mono bg-slate-100 px-2 py-1 rounded">{secret}</span>
                </div>
              )}
              <div className="max-w-sm mx-auto space-y-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Código TOTP (6 dígitos)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
                <button
                  onClick={enable2FA}
                  disabled={isSubmitting}
                  className="w-full px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
                >
                  Ativar authenticator
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {enabled && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <p className="text-sm text-slate-600">Use código TOTP ou recovery code para gerar novos códigos de recuperação.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Código TOTP (6 dígitos)"
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
            <input
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value)}
              placeholder="Recovery code"
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <button
            onClick={regenerateRecoveryCodes}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold"
          >
            Gerar novos recovery codes
          </button>

          {recoveryCodes && recoveryCodes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-800">Recovery codes</p>
                <button
                  onClick={() => navigator.clipboard.writeText(recoveryCodes.join('\n'))}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 flex items-center gap-2"
                >
                  <Copy className="w-3 h-3" /> Copiar todos
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {recoveryCodes.map((item) => (
                  <div key={item} className="px-2 py-1.5 bg-slate-100 rounded text-xs font-mono text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
