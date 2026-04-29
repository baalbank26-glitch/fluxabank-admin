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

const canOpenAttachment = (url: string) => {
  const safeUrl = String(url || '').trim();
  if (!safeUrl) return false;
  return safeUrl.startsWith('http://') || safeUrl.startsWith('https://') || safeUrl.startsWith('data:');
};

const canOpenAttachmentInNewTab = (url: string) => {
  const safeUrl = String(url || '').trim();
  if (!safeUrl) return false;
  // Browsers block top-frame navigation to data: URLs for security reasons.
  return safeUrl.startsWith('http://') || safeUrl.startsWith('https://');
};

const toInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLastDaysRange = (days: number) => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);

  return {
    from: toInputDate(start),
    to: toInputDate(end)
  };
};

export const MED: React.FC = () => {
  const [cases, setCases] = useState<MedCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedTxE2E, setSelectedTxE2E] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [txSearch, setTxSearch] = useState('');
  const [txFrom, setTxFrom] = useState('');
  const [txTo, setTxTo] = useState('');
  const [txPage, setTxPage] = useState(1);
  const [txPageSize, setTxPageSize] = useState(100);
  const [txTotalPages, setTxTotalPages] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  const [txHasMore, setTxHasMore] = useState(false);
  const [txPeriodPreset, setTxPeriodPreset] = useState<'ALL' | '7D' | '30D' | '90D' | 'CUSTOM'>('ALL');
  const [txQuickFilter, setTxQuickFilter] = useState<'ALL' | 'PIX_IN' | 'PIX_OUT' | 'API' | 'WITH_MED' | 'WITHOUT_MED'>('ALL');
  const [lightboxImage, setLightboxImage] = useState<{ url: string; filename?: string } | null>(null);
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

  const fetchTransactions = async ({ silent = false, reset = false, append = false, page }: { silent?: boolean; reset?: boolean; append?: boolean; page?: number } = {}) => {
    if (!silent) setTxLoading(true);

    const targetPage = reset ? 1 : (page || txPage);

    try {
      const result = await api.med.listTransactions({
        search: txSearch,
        from: txFrom || undefined,
        to: txTo || undefined,
        filter: txQuickFilter,
        page: targetPage,
        pageSize: txPageSize,
      });

      const txRows = Array.isArray(result?.items) ? result.items : [];
      const meta = result?.meta;

      setTransactions((prev: any[]) => (append ? [...prev, ...txRows] : txRows));

      const currentPage = Number(meta?.page || targetPage || 1);
      const totalPages = Number(meta?.totalPages || 1);
      const total = Number(meta?.total || txRows.length);

      setTxPage(currentPage);
      setTxTotalPages(totalPages);
      setTxTotal(total);
      setTxHasMore(currentPage < totalPages);
    } catch (error) {
      console.error('Failed to fetch MED transactions', error);
      if (!silent) setTransactions([]);
      setTxPage(1);
      setTxTotalPages(1);
      setTxTotal(0);
      setTxHasMore(false);
    } finally {
      if (!silent) setTxLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchTransactions({ reset: true });
    }, 300);

    return () => clearTimeout(timeout);
  }, [txSearch, txFrom, txTo, txPageSize]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchTransactions({ silent: true, reset: true });
    }, 8000);

    return () => clearInterval(interval);
  }, [txSearch, txFrom, txTo, txPageSize]);

  const handleLoadMoreTransactions = () => {
    if (txLoading || !txHasMore) return;
    fetchTransactions({ append: true, page: txPage + 1 });
  };

  const applyTxPeriodPreset = (preset: 'ALL' | '7D' | '30D' | '90D') => {
    setTxPeriodPreset(preset);

    if (preset === 'ALL') {
      setTxFrom('');
      setTxTo('');
      return;
    }

    const daysMap: Record<'7D' | '30D' | '90D', number> = {
      '7D': 7,
      '30D': 30,
      '90D': 90,
    };

    const range = getLastDaysRange(daysMap[preset]);
    setTxFrom(range.from);
    setTxTo(range.to);
  };

  const handleAction = async (id: string, action: 'ACCEPT_REFUND' | 'REJECT_REFUND' | 'MARK_UNDER_REVIEW') => {
      if (!confirm(action === 'ACCEPT_REFUND' ? 'Confirmar devoluo do valor?' : 'Rejeitar devoluo?')) return;
      
      setProcessingId(id);
      try {
          await api.med.action(id, action);
          toast.success('Ao realizada com sucesso');
          setSelectedCase(null);
          fetchCases();
      } catch (error) {
          toast.error('Erro ao processar ao');
      } finally {
          setProcessingId(null);
      }
  };

  const handleSelectTransaction = (tx: any) => {
    setNewMed((prev: typeof newMed) => ({
      ...prev,
      transactionId: String(tx.transaction_id),
      userId: String(tx.user_id),
      amount: Number(tx.amount || 0).toFixed(2)
    }));
    setSelectedTxE2E(String(tx.e2e || ''));
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
      toast.error('Preencha transao, usurio, valor e motivo.');
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
      setSelectedTxE2E('');
      await fetchCases();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao criar MED.');
    } finally {
      setCreating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-orange-100 text-orange-700 border-orange-200';
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
  const safeCases = cases.filter((c: MedCase | null | undefined) => !!c);
  const filteredCases = safeCases.filter((c: MedCase) => {
    const term = searchTerm.toLowerCase();
    const id = (c.id || '').toLowerCase();
    const tx = (c.transactionId || '').toLowerCase();
    const e2e = (c.e2e || '').toLowerCase();
    const client = (c.clientName || '').toLowerCase();
    const bank = (c.reporterBank || '').toLowerCase();

    return id.includes(term) || tx.includes(term) || e2e.includes(term) || client.includes(term) || bank.includes(term);
  });

  const txRows = useMemo(() => {
    const matchesQuickFilter = (tx: any) => {
      if (txQuickFilter === 'ALL') return true;

      const direction = String(tx.direction || '').toUpperCase().trim();
      const sourceChannel = String(tx.source_channel || '').toUpperCase().trim();
      const txType = String(tx.tx_type || '').toUpperCase().trim();
      const description = String(tx.description || '').toUpperCase();

      // ?? PIX_IN: CREDIT direction + PIX source (precise detection)
      if (txQuickFilter === 'PIX_IN') {
        const isPix = sourceChannel.includes('PIX') || txType.includes('PIX') || txType.includes('DEPOSIT') || description.includes('PIX');
        const isInbound = direction === 'CREDIT' || txType === 'DEPOSIT';
        return isPix && isInbound;
      }

      // ?? PIX_OUT: DEBIT direction + PIX source (precise detection)
      if (txQuickFilter === 'PIX_OUT') {
        const isPix = sourceChannel.includes('PIX') || txType.includes('PIX') || txType.includes('WITHDRAW') || description.includes('PIX');
        const isOutbound = direction === 'DEBIT' || txType === 'WITHDRAW';
        return isPix && isOutbound;
      }

      // API channel filter
      if (txQuickFilter === 'API') {
        return sourceChannel.includes('API') || txType.includes('API') || description.includes('API');
      }

      // MED association filters
      if (txQuickFilter === 'WITH_MED') {
        return Boolean(tx.med_id);
      }

      if (txQuickFilter === 'WITHOUT_MED') {
        return !tx.med_id;
      }

      return true;
    };

    // Backend already applies search filtering (E2E variations handled server-side via normalized regexp)
    // Client-side only applies quick-filter for instant UI feedback (BFS-like breadth, no re-query)
    return (transactions || []).filter((tx: any) => matchesQuickFilter(tx));
  }, [transactions, txQuickFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <h2 className="text-2xl font-bold text-slate-800">Mecanismo Especial de Devoluo</h2>
             <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-600 border border-orange-200 uppercase tracking-wide">rea Sensvel</span>
          </div>
          <p className="text-slate-500 text-sm">Gerencie disputas, bloqueios cautelares e solicitaes de devoluo do Banco Central.</p>
        </div>
        <div className="flex gap-2">
           <button
             onClick={() => {
               fetchCases();
               fetchTransactions({ reset: true });
             }}
             className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-all"
           >
             <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
           </button>
           <button
             onClick={() => setShowCreateModal(true)}
             className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium shadow-sm shadow-orange-200 transition-all"
           >
             <PlusCircle className="w-4 h-4" /> Marcar Transaçãomo MED
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-orange-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute right-0 top-0 w-24 h-24 bg-orange-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-orange-600 font-medium mb-2">
              <AlertTriangle className="w-4 h-4" /> Em Anlise
            </div>
            <h3 className="text-3xl font-bold text-slate-800">
                {safeCases.filter(c => c.status === 'OPEN' || c.status === 'UNDER_REVIEW' || c.status === 'DEFENSE_SENT').length}
            </h3>
            <p className="text-sm text-slate-500 mt-1">Casos pendentes de ao</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute right-0 top-0 w-24 h-24 bg-slate-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
             <div className="flex items-center gap-2 text-slate-600 font-medium mb-2">
              <CheckCircle className="w-4 h-4" /> Devolues Realizadas
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
            Transaes em tempo real (PIX IN/OUT, API, etc.)
          </h3>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={txSearch}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTxSearch(e.target.value)}
              placeholder="Buscar por TX, externalId, usurio, email, descrio..."
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none w-full"
            />
          </div>
        </div>

        <div className="px-4 py-3 border-b border-slate-100 bg-white">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Presets de perodo */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Perodo:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'ALL', label: 'Todo perodo' },
                  { key: '7D', label: '7 dias' },
                  { key: '30D', label: '30 dias' },
                  { key: '90D', label: '90 dias' }
                ].map((preset) => {
                  const active = txPeriodPreset === preset.key;
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => applyTxPeriodPreset(preset.key as 'ALL' | '7D' | '30D' | '90D')}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        active
                          ? 'bg-orange-50 text-orange-700 border-orange-200'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filtro de data customizado */}
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center w-full lg:w-auto lg:ml-auto">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">De:</span>
              <input
                type="date"
                value={txFrom}
                max={txTo || undefined}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setTxFrom(e.target.value);
                  setTxPeriodPreset('CUSTOM');
                }}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-300 outline-none"
              />
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">at:</span>
              <input
                type="date"
                value={txTo}
                min={txFrom || undefined}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setTxTo(e.target.value);
                  setTxPeriodPreset('CUSTOM');
                }}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-300 outline-none"
              />
              {(txFrom || txTo) && (
                <button
                  onClick={() => {
                    setTxFrom('');
                    setTxTo('');
                    setTxPeriodPreset('ALL');
                  }}
                  className="px-2 py-2 text-xs font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
                  title="Limpar filtro de data"
                >
                  ? Limpar
                </button>
              )}
              <select
                value={txPageSize}
                onChange={(e) => setTxPageSize(Number(e.target.value))}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-red-300 outline-none"
              >
                {[50, 100, 200, 500].map((size) => (
                  <option key={size} value={size}>Página: {size}</option>
                ))}
              </select>
            </div>
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
                    ? 'bg-orange-50 text-orange-700 border-orange-200'
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
            <div className="p-6 text-sm text-slate-500 flex items-center justify-center gap-2">
              {txLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                  <span>Carregando, Espere!</span>
                </>
              ) : (
                <span>Nenhuma transação encontrada.</span>
              )}
            </div>
          ) : (
            <>
              {txRows.map((tx) => (
                <button
                  type="button"
                  key={`${tx.transaction_id}-${tx.user_id}-${tx.external_id || 'no-ext'}`}
                  onClick={() => handleOpenCreateFromTx(tx)}
                  className="w-full text-left p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div className="space-y-1">
                      <div className="text-xs text-slate-500">
                        TX {tx.transaction_id}  USER {tx.user_id}  {tx.source_channel || 'WALLET'}  {tx.direction || '-'}
                      </div>
                      <div className="font-medium text-slate-800">
                        {tx.user_name || '-'}  R$ {Number(tx.amount || 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-500 break-all">
                        {tx.description || '-'}
                        {tx.med_id ? `  MED ${tx.med_code || tx.med_id} (${tx.med_status || 'OPEN'})` : ''}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 md:text-right">{safeDateTime(tx.created_at)}</div>
                  </div>
                </button>
              ))}
              <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="text-xs text-slate-500">
                  Página {txPage} de {txTotalPages}  {txTotal} transações encontradas
                </div>
                <button
                  type="button"
                  onClick={handleLoadMoreTransactions}
                  disabled={!txHasMore || txLoading}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  {txLoading ? 'Carregando...' : txHasMore ? 'Carregar mais antigas' : 'Fim do histrico'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[300px]">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <FileWarning className="w-5 h-5 text-slate-400" />
            Solicitaes Recentes
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar ID, E2E, transao ou cliente..." 
                className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none w-64 md:w-80" 
            />
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredCases.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                {searchTerm ? 'Nenhuma disputa encontrada para sua busca.' : 'Nenhuma disputa registrada.'}
              </div>
            ) : (
              filteredCases.map((item) => (
                <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 w-full">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-2 ${item.status === 'OPEN' ? 'bg-orange-50 border-orange-100 text-orange-600' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
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
                        <span className="text-xs font-mono text-slate-500 break-all">E2E: {item.e2e || '-'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col justify-between md:items-end w-full md:w-auto gap-1 min-w-[150px]">
                    <div className="flex flex-col md:items-end">
                      <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Valor Contestado</span>
                      <span className="text-lg font-bold text-slate-800">R$ {(Number(item.amount) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <span className="text-xs text-orange-500 font-medium flex items-center gap-1 self-end md:self-end">
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
                        className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 shadow-sm shadow-orange-200 transition-colors flex-1 md:flex-none"
                      >
                        Analisar
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
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
                <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
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
                    <p className="font-mono text-xs text-slate-500 break-all mt-1">E2E: {selectedCase.e2e || '-'}</p>
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
                      <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-orange-500 shrink-0 mt-1 ring-4 ring-white"></div>
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-slate-800">Notificao de Infrao</p>
                        <p className="text-xs text-slate-500">
                          {safeDateTime(selectedCase.reportedAt)}  {selectedCase.reporterBank || 'Banco'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Defesa do Usurio</label>
                  <div className="mt-1 sm:mt-2 p-2 sm:p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs sm:text-sm text-slate-700 whitespace-pre-wrap">
                    {selectedCase.defenseText || 'Sem defesa enviada at o momento.'}
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
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                {canOpenAttachment(att.url) && (
                                  <button
                                    type="button"
                                    onClick={() => setLightboxImage({ url: att.url, filename: att.filename })}
                                    className="inline-flex items-center px-2.5 py-1.5 rounded-md border border-indigo-200 bg-indigo-50 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                                  >
                                    Ampliar
                                  </button>
                                )}
                                {canOpenAttachmentInNewTab(att.url) && (
                                  <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center px-2.5 py-1.5 rounded-md border border-blue-200 bg-blue-50 text-xs font-medium text-blue-700 hover:bg-blue-100"
                                  >
                                    Abrir imagem
                                  </a>
                                )}
                                {isDataUrl(att.url) && (
                                  <span className="inline-flex items-center px-2.5 py-1.5 rounded-md border border-amber-200 bg-amber-50 text-xs font-medium text-amber-700">
                                    Data URL: use Ampliar
                                  </span>
                                )}
                                {canOpenAttachment(att.url) && (
                                  <a
                                    href={att.url}
                                    download={att.filename || 'anexo-med'}
                                    className="inline-flex items-center px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
                                  >
                                    Baixar arquivo
                                  </a>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {canOpenAttachmentInNewTab(att.url) ? (
                                <a
                                  href={att.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex text-xs text-blue-600 hover:underline break-all"
                                >
                                  {att.url}
                                </a>
                              ) : (
                                <span className="inline-flex text-xs text-slate-500 break-all">
                                  {isDataUrl(att.url) ? 'Arquivo anexado (data URL)' : att.url}
                                </span>
                              )}
                              <div className="flex flex-wrap items-center gap-2">
                                {canOpenAttachmentInNewTab(att.url) && (
                                  <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center px-2.5 py-1.5 rounded-md border border-blue-200 bg-blue-50 text-xs font-medium text-blue-700 hover:bg-blue-100"
                                  >
                                    Abrir arquivo
                                  </a>
                                )}
                                {isDataUrl(att.url) && (
                                  <span className="inline-flex items-center px-2.5 py-1.5 rounded-md border border-amber-200 bg-amber-50 text-xs font-medium text-amber-700">
                                    Data URL: use Baixar
                                  </span>
                                )}
                                {canOpenAttachment(att.url) && (
                                  <a
                                    href={att.url}
                                    download={att.filename || 'anexo-med'}
                                    className="inline-flex items-center px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
                                  >
                                    Baixar arquivo
                                  </a>
                                )}
                              </div>
                            </div>
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
                {processingId === selectedCase.id ? 'Processando...' : 'Rejeitar Devoluo'}
              </button>
              <button
                disabled={processingId === selectedCase.id}
                onClick={() => handleAction(selectedCase.id, 'MARK_UNDER_REVIEW')}
                className="px-3 sm:px-4 py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors shadow-md shadow-amber-200 disabled:opacity-50 text-xs sm:text-sm"
              >
                {processingId === selectedCase.id ? 'Processando...' : 'Marcar em Anlise'}
              </button>
              <button
                disabled={
                  processingId === selectedCase.id ||
                  !['OPEN', 'DEFENSE_SENT', 'UNDER_REVIEW'].includes(selectedCase.status)
                }
                onClick={() => handleAction(selectedCase.id, 'ACCEPT_REFUND')}
                className="px-3 sm:px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors shadow-md shadow-orange-200 disabled:opacity-50 text-xs sm:text-sm"
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
                <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
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
                  onChange={(e) => {
                    setNewMed((p) => ({ ...p, transactionId: e.target.value }));
                    setSelectedTxE2E('');
                  }}
                />
                <input
                  className="px-3 py-2 border border-slate-200 rounded-lg bg-slate-50"
                  placeholder="E2E da transação"
                  value={selectedTxE2E || '-'}
                  readOnly
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
                      <div className="text-xs text-slate-500">TX {tx.transaction_id}  USER {tx.user_id}  {tx.source_channel || 'WALLET'}  {tx.direction || '-'}</div>
                      <div className="text-xs font-mono text-slate-500 break-all">E2E: {tx.e2e || '-'}</div>
                      <div className="font-medium text-slate-800">{tx.user_name || '-'}  R$ {Number(tx.amount || 0).toFixed(2)}</div>
                      <div className="text-xs text-slate-500">{tx.description || '-'} {tx.med_id ? ` MED ${tx.med_code || tx.med_id}` : ''}</div>
                    </button>
                  ))}
                  {txRows.length === 0 && (
                    <div className="p-4 text-sm text-slate-500">Nenhuma transao elegvel encontrada.</div>
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
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {creating ? 'Criando...' : 'Criar MED e reter valor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {lightboxImage && (
        <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-3 sm:p-6">
          <div className="absolute top-3 right-3 sm:top-5 sm:right-5 flex items-center gap-2">
            {canOpenAttachmentInNewTab(lightboxImage.url) ? (
              <a
                href={lightboxImage.url}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg border border-blue-300 bg-blue-50 text-xs sm:text-sm font-medium text-blue-700 hover:bg-blue-100"
              >
                Abrir em nova aba
              </a>
            ) : (
              <span className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-xs sm:text-sm font-medium text-amber-700">
                Data URL: bloqueado em nova aba
              </span>
            )}
            <a
              href={lightboxImage.url}
              download={lightboxImage.filename || 'anexo-med'}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Baixar
            </a>
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Fechar
            </button>
          </div>

          <button
            type="button"
            aria-label="Fechar visualizao ampliada"
            onClick={() => setLightboxImage(null)}
            className="absolute inset-0 cursor-zoom-out"
          />

          <img
            src={lightboxImage.url}
            alt={lightboxImage.filename || 'Anexo ampliado'}
            className="relative z-[71] max-h-[88vh] max-w-[94vw] rounded-xl border border-slate-700 shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};


