import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  Shield, 
  Server, 
  Loader2,
  Save,
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';

export const Settings: React.FC = () => {
  const defaultMessage = 'O sistema está em manutenção até 02:00.';

  const parseAllowedUserIds = (value: string): number[] => {
    return Array.from(
      new Set(
        value
          .split(/[\n,;\s]+/)
          .map((token) => Number(token.trim()))
          .filter((id) => Number.isInteger(id) && id > 0)
      )
    );
  };

  // Inicializa com a mensagem padrão pedida
  const [maintenance, setMaintenance] = useState({ 
    isActive: false, 
    message: defaultMessage,
    allowedUserIdsText: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load initial settings
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await api.admin.settings.getMaintenance();
      if (data) {
        setMaintenance({
          isActive: !!data.isActive,
          message: data.message || defaultMessage,
          allowedUserIdsText: Array.isArray(data.allowedUserIds) ? data.allowedUserIds.join(', ') : ''
        });
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMaintenance = async () => {
    const newState = !maintenance.isActive;
    const messageToSend = maintenance.message || defaultMessage;
    const allowedUserIds = parseAllowedUserIds(maintenance.allowedUserIdsText);

    setIsSaving(true);

    try {
      const response = await api.admin.settings.updateMaintenance(newState, messageToSend, allowedUserIds);
      
      if (response) {
        setMaintenance(prev => ({ 
           ...prev, 
           isActive: newState,
            message: messageToSend,
            allowedUserIdsText: allowedUserIds.join(', ')
        }));
      } else {
        toast.error('Erro: O servidor não confirmou a alteração. Verifique sua conexão.');
        // Recarrega para garantir consistência
        loadSettings();
      }
    } catch (e) {
      toast.error('Erro de conexão ao atualizar modo manutenção.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateMessage = async () => {
    const allowedUserIds = parseAllowedUserIds(maintenance.allowedUserIdsText);
    setIsSaving(true);
    try {
      const response = await api.admin.settings.updateMaintenance(maintenance.isActive, maintenance.message, allowedUserIds);
      if (response) {
        toast.success('Mensagem de manutenção atualizada com sucesso!');
      } else {
        toast.error('Erro ao salvar mensagem no servidor.');
      }
    } catch (e) {
      toast.error('Erro ao comunicar com o servidor.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateAllowedUsers = async () => {
    const allowedUserIds = parseAllowedUserIds(maintenance.allowedUserIdsText);

    setIsSaving(true);
    try {
      const response = await api.admin.settings.updateMaintenance(
        maintenance.isActive,
        maintenance.message || defaultMessage,
        allowedUserIds
      );

      if (response) {
        setMaintenance((prev) => ({ ...prev, allowedUserIdsText: allowedUserIds.join(', ') }));
        toast.success('Lista de IDs liberados atualizada!');
      } else {
        toast.error('Erro ao salvar IDs liberados no servidor.');
      }
    } catch (e) {
      toast.error('Erro ao comunicar com o servidor.');
    } finally {
      setIsSaving(false);
    }
  };

  const parsedAllowedUserIds = parseAllowedUserIds(maintenance.allowedUserIdsText);

  if (isLoading) {
    return <div className="flex justify-center p-20"><Loader2 className="animate-spin w-8 h-8 text-orange-600"/></div>;
  }

  return (
    <div className="space-y-6">
       <div>
          <h2 className="text-2xl font-bold text-slate-800">Configurações do Sistema</h2>
          <p className="text-slate-500 text-sm">Parâmetros globais e controle de disponibilidade.</p>
        </div>

      <div className={`rounded-2xl border shadow-sm overflow-hidden transition-all duration-300 ${maintenance.isActive ? 'bg-gradient-to-br from-orange-50 via-white to-sky-50 border-orange-200 shadow-orange-200/40' : 'bg-white border-slate-200'}`}>
        <div className={`p-6 border-b ${maintenance.isActive ? 'border-orange-200 bg-gradient-to-r from-orange-50 to-sky-50' : 'border-slate-100'}`}>
          <h3 className={`font-bold text-lg flex items-center gap-2 ${maintenance.isActive ? 'text-orange-800' : 'text-slate-800'}`}>
            <Server className="w-5 h-5" /> Sistema & Disponibilidade
          </h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="pr-4">
              <p className={`font-medium text-lg ${maintenance.isActive ? 'text-orange-900' : 'text-slate-800'}`}>
                Modo Manutenção
              </p>
              <p className={`text-sm mt-1 ${maintenance.isActive ? 'text-orange-700' : 'text-slate-500'}`}>
                {maintenance.isActive 
                  ? 'ATIVO: O gateway está rejeitando novas conexões.' 
                  : 'INATIVO: O sistema está operando normalmente.'}
              </p>
            </div>
            
            <button 
              disabled={isSaving}
              onClick={handleToggleMaintenance}
              className={`
                relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2
                ${maintenance.isActive ? 'bg-orange-600' : 'bg-slate-200'}
                ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <span className="sr-only">Toggle Maintenance</span>
              <span
                className={`
                  pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                  ${maintenance.isActive ? 'translate-x-6' : 'translate-x-0'}
                `}
              >
                 {isSaving && <Loader2 className="w-4 h-4 text-slate-400 animate-spin m-1.5" />}
              </span>
            </button>
          </div>

          {maintenance.isActive && (
            <div className="animate-in fade-in slide-in-from-top-2 pt-6 border-t border-orange-200/70">
              <div className="rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-sky-50 shadow-[0_20px_60px_-30px_rgba(8,145,178,0.45)] overflow-hidden">
                <div className="border-b border-orange-100 bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-5 text-white">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-100">Modo ativo</p>
                      <h4 className="mt-2 text-xl font-bold">Configuração do aviso e exceções</h4>
                      <p className="mt-1 max-w-2xl text-sm text-orange-100/90">
                        Defina a mensagem pública exibida pela API e controle quais IDs continuam autorizados durante a janela de manutenção.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-right backdrop-blur-sm">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-orange-100">Status</p>
                      <p className="mt-1 text-sm font-semibold">Gateway protegido</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 p-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                  <div className="rounded-2xl border border-orange-100 bg-white/90 p-5 shadow-sm">
                    <label className="block text-sm font-bold text-orange-800 mb-3">Mensagem de Bloqueio</label>
                    <p className="mb-4 text-sm text-slate-500">
                      Este texto aparece para integrações e acessos bloqueados enquanto a manutenção estiver habilitada.
                    </p>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        type="text"
                        value={maintenance.message}
                        onChange={(e) => setMaintenance({...maintenance, message: e.target.value})}
                        className="flex-1 rounded-2xl border border-orange-200 bg-orange-50/40 px-4 py-3 text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                        placeholder="Ex: Sistema em manutenção até as 14h."
                      />
                      <button
                        onClick={handleUpdateMessage}
                        disabled={isSaving}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 py-3 font-medium text-white shadow-lg shadow-orange-700/20 transition-all hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap"
                      >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Salvar mensagem
                      </button>
                    </div>

                    <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full bg-sky-100 p-1.5 text-sky-700">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                        </div>
                        <div>
                          <p className="font-semibold">Impacto imediato</p>
                          <p className="mt-1 text-sky-800/80">
                            Alterar este status afeta imediatamente os endpoints públicos do gateway e os acessos sem exceção configurada.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-orange-100 bg-slate-950 p-5 text-white shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <label className="block text-sm font-bold text-white">IDs liberados durante manutenção</label>
                        <p className="mt-2 text-sm text-slate-300">
                          Use vírgula, espaço ou quebra de linha. O campo aceita múltiplos IDs e remove duplicados automaticamente.
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Liberados</p>
                        <p className="mt-1 text-lg font-semibold text-white">{parsedAllowedUserIds.length}</p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
                      <textarea
                        value={maintenance.allowedUserIdsText}
                        onChange={(e) => setMaintenance({ ...maintenance, allowedUserIdsText: e.target.value })}
                        className="min-h-[148px] w-full resize-y rounded-xl border border-transparent bg-slate-900 px-4 py-3 font-mono text-sm text-slate-100 outline-none transition-all placeholder:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20"
                        placeholder={'251\n300\n450'}
                      />

                      <div className="mt-3 flex flex-wrap gap-2">
                        {parsedAllowedUserIds.length > 0 ? (
                          parsedAllowedUserIds.map((id) => (
                            <span
                              key={id}
                              className="rounded-full border border-orange-400/30 bg-orange-500/15 px-3 py-1 text-xs font-semibold text-orange-100"
                            >
                              ID {id}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">
                            Nenhum ID liberado no momento.
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-slate-400">
                        Exemplo: 251, 300, 450 ou um ID por linha.
                      </p>
                      <button
                        onClick={handleUpdateAllowedUsers}
                        disabled={isSaving}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-medium text-slate-900 transition-all hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Salvar IDs
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}


          
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden opacity-60 pointer-events-none grayscale">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800">
            <Shield className="w-5 h-5 text-slate-500" /> Segurança (Em breve)
          </h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800">Autenticação 2FA Global</p>
              <p className="text-sm text-slate-500">Forçar 2FA para todos os administradores.</p>
            </div>
             <div className="h-6 w-11 bg-slate-200 rounded-full"></div>
          </div>
           <div className="h-px bg-slate-100"></div>
          <div>
            <p className="font-medium text-slate-800 mb-2">Lista Branca de IPs (Admin)</p>
            <textarea 
              readOnly
              className="w-full border border-slate-200 rounded-lg p-3 text-sm font-mono bg-slate-50 resize-none" 
              rows={3}
              value="Funcionalidade em desenvolvimento..."
            ></textarea>
          </div>
        </div>
      </div>
    </div>
  );
};

