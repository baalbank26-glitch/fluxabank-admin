import React, { useState, useEffect } from 'react';
import { Loader2, Send, Check, X, Copy, AlertCircle, TrendingDown } from 'lucide-react';
import { otcAdminService } from '../services/otc.service';

interface OTCWithdrawal {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  amountBrl: number;
  feeAmountBrl: number;
  netAmountBrl: number;
  cryptoCurrency: string;
  cryptoAmount: number;
  cryptoRate: number;
  walletAddress: string;
  walletNetwork: string;
  walletMemo?: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  txHash?: string;
  adminNotes?: string;
  createdAt: string;
  completedAt?: string;
  completedBy?: number;
}

const OTCWithdrawals: React.FC = () => {
  const [withdrawals, setWithdrawals] = useState<OTCWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'processing' | 'completed' | 'cancelled'>('pending');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<OTCWithdrawal | null>(null);
  const [txHash, setTxHash] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationModal, setValidationModal] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  useEffect(() => {
    fetchWithdrawals(filter);
    const interval = setInterval(() => fetchWithdrawals(filter), 10000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchWithdrawals = async (status: typeof filter = filter) => {
    try {
      setLoading(true);
      const res = await otcAdminService.getAllWithdrawals({ status: status !== 'all' ? status : undefined });
      setWithdrawals(res || []);
    } catch (e) {
      console.error('Erro ao carregar saques OTC:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWithdrawal = (w: OTCWithdrawal) => {
    setSelectedWithdrawal(w);
    setTxHash(w.txHash || '');
    setAdminNotes(w.adminNotes || '');
    setError(null);
    setSuccess(null);
  };

  const handleUpdateStatus = async (status: 'processing' | 'completed' | 'cancelled') => {
    if (!selectedWithdrawal) return;

    // Validação rigorosa do hash para status "completed"
    const cleanHash = (txHash || '').trim();
    console.log('[OTC] Status:', status, 'Hash:', JSON.stringify(txHash), 'Clean Hash:', JSON.stringify(cleanHash));
    
    if (status === 'completed') {
      if (!cleanHash || cleanHash.length === 0) {
        setValidationModal({ type: 'error', message: 'Hash da transação é obrigatório para marcar como completo.' });
        return;
      }
    }

    setProcessing(true);
    try {
      await otcAdminService.updateWithdrawalStatus(
        selectedWithdrawal.id,
        status,
        cleanHash || undefined,
        adminNotes || undefined
      );

      setValidationModal({ type: 'success', message: `Saque marcado como ${status} com sucesso.` });
      setSelectedWithdrawal(null);
      setTxHash('');
      setAdminNotes('');
      await fetchWithdrawals();
    } catch (e: any) {
      setValidationModal({ type: 'error', message: e?.message || 'Erro ao atualizar status' });
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'processing':
        return 'Processando';
      case 'completed':
        return 'Completo';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <TrendingDown className="w-8 h-8 text-amber-500" />
          Saques OTC
        </h2>
        <p className="text-slate-600 mt-1">Gerenciar solicitações de saque de criptomoedas</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {['all', 'pending', 'processing', 'completed', 'cancelled'].map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f as any);
              setSelectedWithdrawal(null);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === f
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            {f === 'all' ? 'Todos' : getStatusLabel(f)}
          </button>
        ))}
      </div>

      {/* Sucesso */}
      {success && (
        <div className="p-4 bg-green-50 text-green-700 rounded-lg border border-green-200 flex items-center gap-2">
          <Check className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Lista de Saques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-lg">
              Nenhum saque encontrado neste filtro.
            </div>
          ) : (
            <div className="space-y-3">
              {withdrawals.map((w) => (
                <div
                  key={w.id}
                  onClick={() => handleSelectWithdrawal(w)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedWithdrawal?.id === w.id
                      ? 'border-indigo-500 bg-indigo-50 shadow-md'
                      : 'border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-slate-900">{w.userName}</h3>
                      <p className="text-xs text-slate-500">{w.userEmail}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(w.status)}`}>
                      {getStatusLabel(w.status)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-slate-500">Moeda:</span>
                      <p className="font-mono font-bold text-slate-900">{w.cryptoAmount.toFixed(8)} {w.cryptoCurrency}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Em BRL:</span>
                      <p className="font-mono font-bold text-slate-900">R$ {w.amountBrl.toFixed(2)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">ID: {w.id}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Painel de Detalhes e Ação */}
        {selectedWithdrawal && (
          <div className="p-6 bg-white border border-slate-200 rounded-lg shadow-md space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Detalhes do Saque</h3>
              <button
                onClick={() => setSelectedWithdrawal(null)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Informações */}
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-slate-500 font-medium">Usuário</p>
                <p className="text-slate-900 font-mono">{selectedWithdrawal.userName}</p>
                <p className="text-xs text-slate-500">{selectedWithdrawal.userEmail}</p>
              </div>

              <div className="border-t pt-3">
                <p className="text-slate-500 font-medium">Criptomoeda</p>
                <p className="text-slate-900 font-bold">
                  {selectedWithdrawal.cryptoAmount.toFixed(8)} {selectedWithdrawal.cryptoCurrency}
                </p>
              </div>

              <div>
                <p className="text-slate-500 font-medium">Valor BRL</p>
                <p className="text-slate-900 font-bold">R$ {selectedWithdrawal.amountBrl.toFixed(2)}</p>
              </div>

              <div>
                <p className="text-slate-500 font-medium">Rede</p>
                <p className="text-slate-900">{selectedWithdrawal.walletNetwork}</p>
              </div>

              <div>
                <p className="text-slate-500 font-medium">Endereço</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs font-mono text-slate-600 break-all">
                    {selectedWithdrawal.walletAddress.slice(0, 20)}...{selectedWithdrawal.walletAddress.slice(-10)}
                  </p>
                  <button
                    onClick={() => copyToClipboard(selectedWithdrawal.walletAddress)}
                    className="p-1 hover:bg-slate-100 rounded"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {selectedWithdrawal.txHash && (
                <div>
                  <p className="text-slate-500 font-medium">Hash TX</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs font-mono text-slate-600 break-all">
                      {selectedWithdrawal.txHash.slice(0, 20)}...{selectedWithdrawal.txHash.slice(-10)}
                    </p>
                    <button
                      onClick={() => copyToClipboard(selectedWithdrawal.txHash || '')}
                      className="p-1 hover:bg-slate-100 rounded"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Formulário de Atualização */}
            {selectedWithdrawal.status === 'pending' || selectedWithdrawal.status === 'processing' ? (
              <div className="border-t pt-4 space-y-3">
                {error && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hash da Transação * <span className="text-red-600">(obrigatório)</span></label>
                  <input
                    type="text"
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    placeholder="0x..."
                    required
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 ${
                      txHash.trim() === '' ? 'border-red-300 bg-red-50' : 'border-slate-300'
                    }`}
                  />
                  {txHash.trim() === '' && (
                    <p className="text-xs text-red-600 mt-1">⚠️ Campo obrigatório para marcar como completo</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notas do Admin</label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Observações..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateStatus('processing')}
                    disabled={processing}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Processando
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('completed')}
                    disabled={processing || !txHash.trim()}
                    className="flex-1 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Completo
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('cancelled')}
                    disabled={processing}
                    className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-t pt-4 p-3 bg-slate-50 rounded text-sm text-slate-600">
                Este saque não pode ser alterado pois já foi {getStatusLabel(selectedWithdrawal.status)}.
              </div>
            )}
          </div>
        )}

        {/* Validation Modal */}
        {validationModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`bg-white rounded-2xl p-6 max-w-md w-full shadow-xl ${validationModal.type === 'error' ? 'border-l-4 border-red-500' : 'border-l-4 border-green-500'}`}>
              <div className="flex items-center gap-3 mb-4">
                {validationModal.type === 'error' ? (
                  <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                ) : (
                  <Check className="w-6 h-6 text-green-600 flex-shrink-0" />
                )}
                <h3 className="text-lg font-bold text-slate-900">
                  {validationModal.type === 'error' ? 'Atenção' : 'Sucesso'}
                </h3>
              </div>
              <p className="text-slate-700 mb-6">{validationModal.message}</p>
              <button
                onClick={() => {
                  setValidationModal(null);
                  if (validationModal.type === 'success') {
                    setSelectedWithdrawal(null);
                  }
                }}
                className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                  validationModal.type === 'error'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OTCWithdrawals;
