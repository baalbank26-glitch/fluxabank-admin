import React, { useEffect, useState } from 'react';
import { Loader2, Webhook, Save, AlertTriangle } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '../services/api';

export const WebhookSettings: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [webhooksDisabled, setWebhooksDisabled] = useState(false);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await api.admin.settings.getWebhookSettings();
      setWebhooksDisabled(Boolean(data?.webhooksDisabled));
    } catch (err) {
      console.error('[WebhookSettings] erro ao carregar:', err);
      toast.error('Nao foi possivel carregar as configuracoes de webhook.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const updated = await api.admin.settings.updateWebhookSettings(webhooksDisabled);
      if (updated) {
        toast.success('Configuracao de webhook atualizada com sucesso.');
      } else {
        toast.error('Nao foi possivel salvar a configuracao de webhook.');
      }
    } catch (err) {
      console.error('[WebhookSettings] erro ao salvar:', err);
      toast.error('Erro de comunicacao ao salvar configuracao de webhook.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-20">
        <Loader2 className="animate-spin w-8 h-8 text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-white">Webhook Settings</h2>
        <p className="text-slate-400 text-sm">Controle global de entrega de webhooks da VIPERPAG.</p>
      </div>

      <div className={`rounded-2xl border overflow-hidden ${webhooksDisabled ? 'border-red-500/30 bg-red-950/10' : 'border-emerald-500/30 bg-[#0f1713]'}`}>
        <div className="p-6 border-b border-emerald-500/20 flex items-center gap-2">
          <Webhook className="w-5 h-5 text-emerald-400" />
          <h3 className="font-extrabold text-lg text-white">Entrega Global de Webhooks</h3>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-bold text-white">Desativar webhooks globalmente</p>
              <p className="text-sm text-slate-400 mt-1">
                Quando ativo, nenhum webhook de PIX IN/PIX OUT sera enviado para clientes, independentemente das URLs configuradas por usuario.
              </p>
            </div>

            <button
              disabled={isSaving}
              onClick={() => setWebhooksDisabled((prev) => !prev)}
              className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${webhooksDisabled ? 'bg-emerald-500' : 'bg-slate-700'} ${isSaving ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <span className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ${webhooksDisabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {webhooksDisabled && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-amber-300 text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-400" />
              Todos os envios de webhook estao pausados globalmente. Eventos continuarao sendo processados internamente.
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={saveSettings}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-slate-950 font-extrabold hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-emerald-500/30 transition-colors"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
