import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { MedCase } from '../types/index';
import {
  Siren,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  FileWarning,
  ChevronDown,
  Loader2,
  RefreshCw,
  PlusCircle,
  ShieldAlert
} from 'lucide-react';

// Helper seguro para datas
const safeDateTime = (dateStr: string | undefined): string => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '-' : d.toLocaleString('pt-BR');
  } catch {
    return '-';
  }
};

const safeDate = (dateStr: string | undefined): string => {
  if (!dateStr) return 'Indefinido';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'Indefinido' : d.toLocaleDateString('pt-BR');
  } catch {
    return 'Indefinido';
  }
};

const isImageAttachment = (att: any) => {
  const mime = String(att?.mimeType || '').toLowerCase();
  const url = String(att?.url || '');
  return mime.startsWith('image/') || url.startsWith('data:image/');
};

const isDataUrl = (url: string) => String(url || '').startsWith('data:');

export const MED: React.FC = () => {
  const [cases, setCases] = useState<MedCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [txSearch, setTxSearch] = useState('');
  const [txQuickFilter, setTxQuickFilter] = useState<'ALL' | 'PIX_IN' | 'PIX_OUT' | 'API' | 'WITH_MED' | 'WITHOUT_MED'>('ALL');
  const [newMed, setNewMed] = useState({
    transactionId: '',
    userId: '',
    amount: '',
    reasonCode: 'SUSPECTED_FRAUD',
    reasonLabel: 'Fraude suspeita',
    note: ''
  });

  const fetchCases = async () => {
    setIsLoading(true);
    try {
      const data = await api.med.list();
      setCases(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch MED data', error);
      setCases([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransactions = async (silent = false) => {
    if (!silent) setTxLoading(true);
    try {
      const txRows = await api.med.listTransactions({ search: txSearch });
      setTransactions(Array.isArray(txRows) ? txRows : []);
    } catch (error) {
      console.error('Failed to fetch MED transactions', error);
      if (!silent) setTransactions([]);
    } finally {
      if (!silent) setTxLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
    fetchTransactions();

    const interval = setInterval(() => {
      fetchTransactions(true);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchTransactions();
    }, 300);

    return () => clearTimeout(timeout);
  }, [txSearch]);

  const handleAction = async (id: string, action: 'ACCEPT_REFUND' | 'REJECT_REFUND' | 'MARK_UNDER_REVIEW') => {
      if (!confirm(action === 'ACCEPT_REFUND' ? 'Confirmar devolução do valor?' : 'Rejeitar devolução?')) return;
      
      setProcessingId(id);
      try {
          await api.med.action(id, action);
          toast.success('Ação realizada com sucesso');
          setSelectedCase(null);
          fetchCases();
      } catch (error) {
          toast.error('Erro ao processar ação');
      } finally {
          setProcessingId(null);
      }
  };

  const handleSelectTransaction = (tx: any) => {
    setNewMed((prev) => ({
      ...prev,
      transactionId: String(tx.transaction_id),
      userId: String(tx.user_id),
      amount: Number(tx.amount || 0).toFixed(2)
    }));
  };

  const handleOpenCase = async (item: MedCase) => {
    try {
      const detail = await api.med.detail(item.id);
      setSelectedCase(detail || item);
    } catch {
      setSelectedCase(item);
    }
  };

  const handleOpenCreateFromTx = (tx: any) => {
    handleSelectTransaction(tx);
    setShowCreateModal(true);
  };

  const handleCreateMed = async () => {
    if (!newMed.transactionId || !newMed.userId || !newMed.amount || !newMed.reasonCode) {
      toast.error('Preencha transação, usuário, valor e motivo.');
      return;
    }

    const txRaw = String(newMed.transactionId).trim();
    const txNumeric = Number(txRaw);
    const transactionIdPayload: string | number = Number.isFinite(txNumeric) && !txRaw.includes('-')
      ? txNumeric
      : txRaw;

    setCreating(true);
    try {
      await api.med.create({
        transactionId: transactionIdPayload,
        userId: Number(newMed.userId),
        amount: Number(newMed.amount),
        reasonCode: newMed.reasonCode,
        reasonLabel: newMed.reasonLabel,
        note: newMed.note
      });

      toast.success('MED criada e valor retido com sucesso.');
      setShowCreateModal(false);
      setNewMed({
        transactionId: '',
        userId: '',
        amount: '',
        reasonCode: 'SUSPECTED_FRAUD',
        reasonLabel: 'Fraude suspeita',
        note: ''
      });
      await fetchCases();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao criar MED.');
    } finally {
      setCreating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-red-100 text-red-700 border-red-200';
      case 'UNDER_REVIEW': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'DEFENSE_SENT': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'REFUND_ACCEPTED': return 'bg-green-100 text-green-700 border-green-200';
      case 'REFUND_REJECTED': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getReasonLabel = (reason: string) => {
    switch(reason) {
      case 'FRAUD': return 'Fraude Confirmada';
      case 'SCAM': return 'Golpe / Engenharia Social';
      case 'ACCOUNT_TAKEOVER': return 'Roubo de Conta';
      case 'SUSPECTED_FRAUD': return 'Fraude Suspeita';
      default: return reason || 'Desconhecido';
    }
  };

  // Filtragem local segura
  const safeCases = cases.filter(c => !!c);
  const filteredCases = safeCases.filter(c => {
    const term = searchTerm.toLowerCase();
    const id = (c.id || '').toLowerCase();
    const tx = (c.transactionId || '').toLowerCase();
    const client = (c.clientName || '').toLowerCase();
    const bank = (c.reporterBank || '').toLowerCase();

    return id.includes(term) || tx.includes(term) || client.includes(term) || bank.includes(term);
  });

  const txRows = useMemo(() => {
    const matchesQuickFilter = (tx: any) => {
      if (txQuickFilter === 'ALL') return true;

      const direction = String(tx.direction || '').toUpperCase();
      const sourceChannel = String(tx.source_channel || '').toUpperCase();
      const txType = String(tx.tx_type || '').toUpperCase();
      const description = String(tx.description || '').toUpperCase();

      if (txQuickFilter === 'PIX_IN') {
        return direction === 'CREDIT' && (sourceChannel === 'PIX' || txType.includes('PIX_IN') || description.includes('PIX'));
      }

      if (txQuickFilter === 'PIX_OUT') {
        return direction === 'DEBIT' && (sourceChannel === 'PIX' || txType.includes('PIX_OUT') || description.includes('PIX'));
      }

      if (txQuickFilter === 'API') {
        return sourceChannel === 'API' || txType.includes('API') || description.includes('API');
      }

      if (txQuickFilter === 'WITH_MED') {
        return Boolean(tx.med_id);
      }

      if (txQuickFilter === 'WITHOUT_MED') {
        return !tx.med_id;
      }

      return true;
    };

    return (transactions || []).filter((tx) => {
      const term = txSearch.trim().toLowerCase();
      if (!matchesQuickFilter(tx)) return false;
      if (!term) return true;

      const haystack = [
        String(tx.transaction_id || ''),
        String(tx.external_id || ''),
        String(tx.user_id || ''),
        String(tx.user_name || ''),
        String(tx.user_email || ''),
        String(tx.description || ''),
        String(tx.direction || ''),
        String(tx.source_channel || ''),
        String(tx.tx_type || '')
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [transactions, txSearch, txQuickFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <h2 className="text-2xl font-bold text-slate-800">Mecanismo Especial de Devolução</h2>
             <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 border border-red-200 uppercase tracking-wide">Área Sensível</span>
          </div>
          <p className="text-slate-500 text-sm">Gerencie disputas, bloqueios cautelares e solicitações de devolução do Banco Central.</p>
        </div>
        <div className="flex gap-2">
           <button onClick={fetchCases} className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-all">
             <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
           </button>
           <button
             onClick={() => setShowCreateModal(true)}
             className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium shadow-sm shadow-red-200 transition-all"
           >
             <PlusCircle className="w-4 h-4" /> Marcar Transação como MED
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute right-0 top-0 w-24 h-24 bg-red-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-red-600 font-medium mb-2">
              <AlertTriangle className="w-4 h-4" /> Em Análise
            </div>
            <h3 className="text-3xl font-bold text-slate-800">
                {safeCases.filter(c => c.status === 'OPEN' || c.status === 'UNDER_REVIEW' || c.status === 'DEFENSE_SENT').length}
            </h3>
            <p className="text-sm text-slate-500 mt-1">Casos pendentes de ação</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute right-0 top-0 w-24 h-24 bg-slate-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
             <div className="flex items-center gap-2 text-slate-600 font-medium mb-2">
              <CheckCircle className="w-4 h-4" /> Devoluções Realizadas
            </div>
            <h3 className="text-3xl font-bold text-slate-800">
                {safeCases.filter(c => c.status === 'REFUND_ACCEPTED').length}
            </h3>
            <p className="text-sm text-slate-500 mt-1">Casos acatados</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute right-0 top-0 w-24 h-24 bg-slate-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
             <div className="flex items-center gap-2 text-slate-600 font-medium mb-2">
              <XCircle className="w-4 h-4" /> Disputas Vencidas
            </div>
            <h3 className="text-3xl font-bold text-slate-800">
                {safeCases.filter(c => c.status === 'REFUND_REJECTED').length}
            </h3>
            <p className="text-sm text-slate-500 mt-1">Casos rejeitados</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${txLoading ? 'animate-spin' : ''}`} />
            Transações em tempo real (PIX IN/OUT, API, etc.)
          </h3>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={txSearch}
              onChange={(e) => setTxSearch(e.target.value)}
              placeholder="Buscar por TX, externalId, usuário, email, descrição..."
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-pagandu-500 outline-none w-full"
            />
          </div>
        </div>

        <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap gap-2 bg-white">
          {[
            { key: 'ALL', label: 'Todas' },
            { key: 'PIX_IN', label: 'PIX_IN' },
            { key: 'PIX_OUT', label: 'PIX_OUT' },
            { key: 'API', label: 'API' },
            { key: 'WITH_MED', label: 'Com MED' },
            { key: 'WITHOUT_MED', label: 'Sem MED' }
          ].map((filter) => {
            const active = txQuickFilter === filter.key;

            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setTxQuickFilter(filter.key as typeof txQuickFilter)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  active
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        <div className="max-h-80 overflow-auto divide-y divide-slate-100">
          {txRows.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">Nenhuma transação encontrada.</div>
          ) : (
            txRows.map((tx) => (
              <button
                type="button"
                key={`${tx.transaction_id}-${tx.user_id}-${tx.external_id || 'no-ext'}`}
                onClick={() => handleOpenCreateFromTx(tx)}
                className="w-full text-left p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="space-y-1">
                    <div className="text-xs text-slate-500">
                      TX {tx.transaction_id} • USER {tx.user_id} • {tx.source_channel || 'WALLET'} • {tx.direction || '-'}
                    </div>
                    <div className="font-medium text-slate-800">
                      {tx.user_name || '-'} • R$ {Number(tx.amount || 0).toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-500 break-all">
                      {tx.description || '-'}
                      {tx.med_id ? ` • MED ${tx.med_code || tx.med_id} (${tx.med_status || 'OPEN'})` : ''}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 md:text-right">{safeDateTime(tx.created_at)}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[300px]">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <FileWarning className="w-5 h-5 text-slate-400" />
            Solicitações Recentes
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar ID, Transação ou Cliente..." 
                className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-pagandu-500 outline-none w-64 md:w-80" 
            />
          </div>
        </div>
        
        {isLoading ? (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="w-8 h-8 text-pagandu-500 animate-spin" />
            </div>
        ) : (
        <div className="divide-y divide-slate-100">
          {filteredCases.length === 0 ? (
             <div className="p-8 text-center text-slate-500">
                 {searchTerm ? 'Nenhuma disputa encontrada para sua busca.' : 'Nenhuma disputa registrada.'}
             </div>
          ) : filteredCases.map((item) => (
            <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1 w-full">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-2 ${item.status === 'OPEN' ? 'bg-red-50 border-red-100 text-red-600' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                    <AlertTriangle className="w-6 h-6" />
                 </div>
                 <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{item.id}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 mt-1">{getReasonLabel(item.reason)}</h4>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-slate-500 mt-1">
                        <span className="font-medium text-slate-700 flex items-center gap-1">
                             {item.clientName || 'Cliente Desconhecido'}
                        </span>

                    </div>
                 </div>
              </div>

              <div className="flex flex-row md:flex-col justify-between md:items-end w-full md:w-auto gap-1 min-w-[150px]">
                <div className="flex flex-col md:items-end">
                    <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Valor Contestado</span>
                    <span className="text-lg font-bold text-slate-800">R$ {(Number(item.amount) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <span className="text-xs text-red-500 font-medium flex items-center gap-1 self-end md:self-end">
                  <Clock className="w-3 h-3" /> {safeDate(item.deadline)}
                </span>
              </div>

              <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                 <button 
                  onClick={() => handleOpenCase(item)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors flex-1 md:flex-none"
                 >
                   Ver Detalhes
                 </button>
                 {item.status === 'OPEN' && (
                   <button 
                     onClick={() => handleOpenCase(item)}
                     className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-sm shadow-red-200 transition-colors flex-1 md:flex-none"
                   >
                     Analisar
                   </button>
                 )}
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {selectedCase && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="bg-white w-full max-w-md sm:max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
            style={{ maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}
          >
            <div className="bg-slate-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                  <Siren className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base sm:text-lg">Detalhes da Disputa MED</h3>
                  <p className="text-xs text-slate-500 break-all">{selectedCase.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCase(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
                aria-label="Fechar detalhes"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cliente Afetado</label>
                  <p className="font-medium text-slate-800 text-base sm:text-lg">
                    {selectedCase.clientName || selectedCase.userName || (selectedCase.userId ? `Cliente ID: ${selectedCase.userId}` : `Cliente ID: ${selectedCase.id}`)}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Transação Original</label>
                  <div className="mt-1 sm:mt-2 p-2 sm:p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="font-mono text-xs text-slate-500 break-all">{selectedCase.transactionId}</p>
                    <div className="flex justify-between items-center mt-1 sm:mt-2">
                      <span className="font-bold text-slate-700 text-sm sm:text-base">R$ {(Number(selectedCase.amount) || 0).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Timeline</label>
                  <div className="mt-1 sm:mt-2 space-y-2 sm:space-y-3 relative before:absolute before:left-[5px] before:top-2 before:bottom-0 before:w-px before:bg-slate-200">
                    <div className="flex gap-2 sm:gap-3 relative">
                      <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-500 shrink-0 mt-1 ring-4 ring-white"></div>
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-slate-800">Notificação de Infração</p>
                        <p className="text-xs text-slate-500">
                          {safeDateTime(selectedCase.reportedAt)} • {selectedCase.reporterBank || 'Banco'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Defesa do Usuário</label>
                  <div className="mt-1 sm:mt-2 p-2 sm:p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs sm:text-sm text-slate-700 whitespace-pre-wrap">
                    {selectedCase.defenseText || 'Sem defesa enviada até o momento.'}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Anexos da Defesa</label>
                  <div className="mt-1 sm:mt-2 space-y-2">
                    {Array.isArray(selectedCase.attachments) && selectedCase.attachments.length > 0 ? (
                      selectedCase.attachments.map((att: any) => (
                        <div
                          key={att.id || att.url}
                          className="block p-2 sm:p-3 rounded-lg border border-slate-200 bg-white text-xs sm:text-sm"
                        >
                          <div className="font-medium text-slate-800 mb-1 sm:mb-2">{att.filename || 'Arquivo anexado'}</div>

                          {isImageAttachment(att) ? (
                            <div className="space-y-1 sm:space-y-2">
                              <img
                                src={att.url}
                                alt={att.filename || 'Anexo da defesa'}
                                className="max-h-40 sm:max-h-56 w-auto rounded-lg border border-slate-200"
                              />
                              {!isDataUrl(att.url) && (
                                <a
                                  href={att.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex text-xs text-blue-600 hover:underline"
                                >
                                  Abrir arquivo em nova aba
                                </a>
                              )}
                            </div>
                          ) : (
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex text-xs text-blue-600 hover:underline break-all"
                            >
                              {isDataUrl(att.url) ? 'Arquivo anexado (data URL)' : att.url}
                            </a>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-2 sm:p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-500">
                        Nenhum anexo enviado.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                disabled={processingId === selectedCase.id}
                onClick={() => handleAction(selectedCase.id, 'REJECT_REFUND')}
                className="px-3 sm:px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-100 transition-colors shadow-sm disabled:opacity-50 text-xs sm:text-sm"
              >
                {processingId === selectedCase.id ? 'Processando...' : 'Rejeitar Devolução'}
              </button>
              <button
                disabled={processingId === selectedCase.id}
                onClick={() => handleAction(selectedCase.id, 'MARK_UNDER_REVIEW')}
                className="px-3 sm:px-4 py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors shadow-md shadow-amber-200 disabled:opacity-50 text-xs sm:text-sm"
              >
                {processingId === selectedCase.id ? 'Processando...' : 'Marcar em Análise'}
              </button>
              <button
                disabled={
                  processingId === selectedCase.id ||
                  !['OPEN', 'DEFENSE_SENT', 'UNDER_REVIEW'].includes(selectedCase.status)
                }
                onClick={() => handleAction(selectedCase.id, 'ACCEPT_REFUND')}
                className="px-3 sm:px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-md shadow-red-200 disabled:opacity-50 text-xs sm:text-sm"
              >
                {processingId === selectedCase.id ? 'Processando devolução...' : 'Acatar e Devolver Valor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Abrir MED em transação</h3>
                  <p className="text-xs text-slate-500">Selecione uma transação e retenha o valor</p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  className="px-3 py-2 border border-slate-200 rounded-lg"
                  placeholder="Transaction ID"
                  value={newMed.transactionId}
                  onChange={(e) => setNewMed((p) => ({ ...p, transactionId: e.target.value }))}
                />
                <input
                  className="px-3 py-2 border border-slate-200 rounded-lg"
                  placeholder="User ID"
                  value={newMed.userId}
                  onChange={(e) => setNewMed((p) => ({ ...p, userId: e.target.value }))}
                />
                <input
                  className="px-3 py-2 border border-slate-200 rounded-lg"
                  placeholder="Valor a reter"
                  value={newMed.amount}
                  onChange={(e) => setNewMed((p) => ({ ...p, amount: e.target.value }))}
                />
                <input
                  className="px-3 py-2 border border-slate-200 rounded-lg"
                  placeholder="Código do motivo"
                  value={newMed.reasonCode}
                  onChange={(e) => setNewMed((p) => ({ ...p, reasonCode: e.target.value }))}
                />
                <input
                  className="px-3 py-2 border border-slate-200 rounded-lg md:col-span-2"
                  placeholder="Rótulo do motivo"
                  value={newMed.reasonLabel}
                  onChange={(e) => setNewMed((p) => ({ ...p, reasonLabel: e.target.value }))}
                />
                <textarea
                  className="px-3 py-2 border border-slate-200 rounded-lg md:col-span-2"
                  placeholder="Observação do admin"
                  value={newMed.note}
                  onChange={(e) => setNewMed((p) => ({ ...p, note: e.target.value }))}
                />
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-700">
                  Transações em tempo real (clique para preencher)
                </div>
                <div className="max-h-64 overflow-auto divide-y divide-slate-100">
                  {txRows.map((tx) => (
                    <button
                      type="button"
                      key={`${tx.transaction_id}-${tx.user_id}`}
                      onClick={() => handleSelectTransaction(tx)}
                      className="w-full text-left p-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="text-xs text-slate-500">TX {tx.transaction_id} • USER {tx.user_id} • {tx.source_channel || 'WALLET'} • {tx.direction || '-'}</div>
                      <div className="font-medium text-slate-800">{tx.user_name || '-'} • R$ {Number(tx.amount || 0).toFixed(2)}</div>
                      <div className="text-xs text-slate-500">{tx.description || '-'} {tx.med_id ? `• MED ${tx.med_code || tx.med_id}` : ''}</div>
                    </button>
                  ))}
                  {txRows.length === 0 && (
                    <div className="p-4 text-sm text-slate-500">Nenhuma transação elegível encontrada.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 bg-white border border-slate-200 rounded-lg">
                Cancelar
              </button>
              <button
                onClick={handleCreateMed}
                disabled={creating}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {creating ? 'Criando...' : 'Criar MED e reter valor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

