import React, { useState, useEffect } from 'react';
import { Bitcoin, RefreshCw, CheckCircle, XCircle, Clock, AlertCircle, Settings } from 'lucide-react';
import { otcAdminService, type OtcWithdrawal, type OtcStats, type OtcSettings } from '../services/otc.service';

export const OTC: React.FC = () => {
  const [withdrawals, setWithdrawals] = useState<OtcWithdrawal[]>([]);
  const [stats, setStats] = useState<OtcStats | null>(null);
  const [settings, setSettings] = useState<OtcSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  
  // Settings modal
  const [showSettings, setShowSettings] = useState(false);
  const [editSettings, setEditSettings] = useState<Partial<OtcSettings>>({});
  
  // Action modal
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<OtcWithdrawal | null>(null);
  const [actionData, setActionData] = useState({ status: '', txHash: '', adminNotes: '' });
  
  // Validation modal
  const [validationModal, setValidationModal] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const filters = filter !== 'all' ? { status: filter } : {};
      const [withdrawalsData, statsData, settingsData] = await Promise.all([
        otcAdminService.getAllWithdrawals(filters),
        otcAdminService.getStats(),
        otcAdminService.getSettings()
      ]);
      setWithdrawals(withdrawalsData);
      setStats(statsData);
      setSettings(settingsData);
      setEditSettings(settingsData);
    } catch (error) {
      console.error('Failed to load OTC data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedWithdrawal) return;
    
    // Validação obrigatória do hash para status "completed"
    if (actionData.status === 'completed' && (!actionData.txHash || actionData.txHash.trim().length === 0)) {
      setValidationModal({ type: 'error', message: 'Hash da transação é obrigatório para marcar como completo.' });
      return;
    }
    
    try {
      await otcAdminService.updateWithdrawalStatus(
        selectedWithdrawal.id,
        actionData.status,
        actionData.txHash || undefined,
        actionData.adminNotes || undefined
      );
      setSelectedWithdrawal(null);
      setActionData({ status: '', txHash: '', adminNotes: '' });
      loadData();
      setValidationModal({ type: 'success', message: 'Status atualizado com sucesso!' });
    } catch (error: any) {
      setValidationModal({ type: 'error', message: 'Erro: ' + (error.message || 'Falha ao atualizar status') });
    }
  };

  const handleUpdateSettings = async () => {
    try {
      await otcAdminService.updateSettings(editSettings);
      setShowSettings(false);
      loadData();
      alert('Configurações atualizadas!');
    } catch (error: any) {
      alert('Erro: ' + (error.message || 'Falha ao atualizar configurações'));
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700',
      processing: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-orange-100 text-orange-700'
    };
    const icons = {
      pending: Clock,
      processing: RefreshCw,
      completed: CheckCircle,
      cancelled: XCircle
    };
    const Icon = icons[status as keyof typeof icons] || Clock;
    
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles]}`}>
        <Icon className="w-3 h-3" />
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Bitcoin className="w-8 h-8 text-amber-500" />
            Gestão OTC
          </h1>
          <p className="text-slate-500 mt-1">Gerenciar solicitações de saque de criptomoedas</p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
        >
          <Settings className="w-4 h-4" />
          Configurações
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-sm text-slate-500 mb-1">Pendentes</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-sm text-slate-500 mb-1">Em Processamento</p>
            <p className="text-3xl font-bold text-blue-600">{stats.processing}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-sm text-slate-500 mb-1">Concluídas</p>
            <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-sm text-slate-500 mb-1">Taxa Total (BRL)</p>
            <p className="text-3xl font-bold text-cyan-600">
              {stats.completedFeesBrl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'pending', 'processing', 'completed', 'cancelled'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
              filter === f
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {f === 'all' ? 'Todas' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Withdrawals Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Usuário</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Cripto</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Valor (BRL)</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Taxa</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Rede</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Data</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Carregando...
                  </td>
                </tr>
              ) : withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                    Nenhuma solicitação encontrada
                  </td>
                </tr>
              ) : (
                withdrawals.map(w => (
                  <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-sm"># {w.id}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{w.userName}</p>
                        <p className="text-xs text-slate-500">{w.userEmail}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold">{w.cryptoCurrency}</p>
                      <p className="text-xs text-slate-500">{w.cryptoAmount.toFixed(8)}</p>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {w.amountBrl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="px-6 py-4 text-sm text-green-600 font-semibold">
                      +{w.feeAmountBrl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="px-6 py-4 text-sm">{w.walletNetwork}</td>
                    <td className="px-6 py-4">{getStatusBadge(w.status)}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(w.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedWithdrawal(w);
                          setActionData({ status: w.status, txHash: w.txHash || '', adminNotes: w.adminNotes || '' });
                        }}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold text-sm"
                      >
                        Gerenciar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Modal */}
      {selectedWithdrawal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-4">Gerenciar Solicitação #{selectedWithdrawal.id}</h2>
            
            <div className="space-y-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-xl">
                <p className="text-sm text-slate-500">Cliente</p>
                <p className="font-semibold">{selectedWithdrawal.userName} ({selectedWithdrawal.userEmail})</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl">
                  <p className="text-sm text-slate-500">Criptomoeda</p>
                  <p className="font-semibold">{selectedWithdrawal.cryptoAmount.toFixed(8)} {selectedWithdrawal.cryptoCurrency}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl">
                  <p className="text-sm text-slate-500">Rede</p>
                  <p className="font-semibold">{selectedWithdrawal.walletNetwork}</p>
                </div>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl">
                <p className="text-sm text-slate-500 mb-1">Endereço da Carteira</p>
                <p className="font-mono text-sm break-all">{selectedWithdrawal.walletAddress}</p>
                {selectedWithdrawal.walletMemo && (
                  <>
                    <p className="text-sm text-slate-500 mt-2 mb-1">Memo/Tag</p>
                    <p className="font-mono text-sm">{selectedWithdrawal.walletMemo}</p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                <select
                  value={actionData.status}
                  onChange={e => setActionData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="pending">Pendente</option>
                  <option value="processing">Em Processamento</option>
                  <option value="completed">Concluído</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Hash da Transação (Blockchain)</label>
                <input
                  type="text"
                  value={actionData.txHash}
                  onChange={e => setActionData(prev => ({ ...prev, txHash: e.target.value }))}
                  placeholder="0x..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Notas Admin</label>
                <textarea
                  value={actionData.adminNotes}
                  onChange={e => setActionData(prev => ({ ...prev, adminNotes: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Observações internas..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdateStatus}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Salvar Alterações
              </button>
              <button
                onClick={() => setSelectedWithdrawal(null)}
                className="px-6 py-3 bg-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && settings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Configurações OTC</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Taxa (%)</label>
                <input
                  type="number"
                  step="0.00001"
                  value={editSettings.feePercentage || 0}
                  onChange={e => setEditSettings(prev => ({ ...prev, feePercentage: parseFloat(e.target.value) }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Saque Mínimo (BRL)</label>
                <input
                  type="number"
                  value={editSettings.minWithdrawalBrl || 0}
                  onChange={e => setEditSettings(prev => ({ ...prev, minWithdrawalBrl: parseFloat(e.target.value) }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Saque Máximo (BRL)</label>
                <input
                  type="number"
                  value={editSettings.maxWithdrawalBrl || 0}
                  onChange={e => setEditSettings(prev => ({ ...prev, maxWithdrawalBrl: parseFloat(e.target.value) }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="otcEnabled"
                  checked={editSettings.enabled || false}
                  onChange={e => setEditSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="otcEnabled" className="text-sm font-semibold text-slate-700">
                  OTC Habilitado (usuários podem usar)
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdateSettings}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700"
              >
                Salvar
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="px-6 py-3 bg-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Modal */}
      {validationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-2xl p-6 max-w-md w-full shadow-xl ${validationModal.type === 'error' ? 'border-l-4 border-orange-500' : 'border-l-4 border-green-500'}`}>
            <div className="flex items-center gap-3 mb-4">
              {validationModal.type === 'error' ? (
                <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0" />
              ) : (
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              )}
              <h3 className="text-lg font-bold text-slate-900">
                {validationModal.type === 'error' ? 'Atenção' : 'Sucesso'}
              </h3>
            </div>
            <p className="text-slate-700 mb-6">{validationModal.message}</p>
            <button
              onClick={() => setValidationModal(null)}
              className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                validationModal.type === 'error'
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


