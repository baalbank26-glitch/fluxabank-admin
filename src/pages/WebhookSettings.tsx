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
        <Loader2 className="animate-spin w-8 h-8 text-fluxabank-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Webhook Settings</h2>
        <p className="text-slate-500 text-sm">Controle global de entrega de webhooks da Fluxabank.</p>
      </div>

      <div className={`rounded-2xl border shadow-sm overflow-hidden ${webhooksDisabled ? 'border-orange-200 bg-orange-50/40' : 'border-slate-200 bg-white'}`}>
        <div className="p-6 border-b border-slate-100 flex items-center gap-2">
          <Webhook className="w-5 h-5 text-slate-700" />
          <h3 className="font-bold text-lg text-slate-900">Entrega Global de Webhooks</h3>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-800">Desativar webhooks globalmente</p>
              <p className="text-sm text-slate-600 mt-1">
                Quando ativo, nenhum webhook de PIX IN/PIX OUT sera enviado para clientes, independentemente das URLs configuradas por usuario.
              </p>
            </div>

            <button
              disabled={isSaving}
              onClick={() => setWebhooksDisabled((prev) => !prev)}
              className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${webhooksDisabled ? 'bg-orange-500' : 'bg-slate-200'} ${isSaving ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <span className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ${webhooksDisabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {webhooksDisabled && (
            <div className="rounded-xl border border-orange-200 bg-orange-100/70 p-4 text-orange-800 text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5" />
              Todos os envios de webhook estao pausados globalmente. Eventos continuarao sendo processados internamente.
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={saveSettings}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-white font-medium hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
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
