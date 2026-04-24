
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Download, Loader2, ArrowUpRight, Calendar, Filter, X } from 'lucide-react';
import { api } from '../services/api';
import { TreasuryBalance, LedgerItem, TreasurySummary, TreasuryByUserSummary, PaginationMeta } from '../types/index';

export const Treasury: React.FC = () => {
  const [balance, setBalance] = useState<TreasuryBalance>({
    amount: 0,
    currency: 'BRL'
  });

  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [dailySummary, setDailySummary] = useState<TreasurySummary[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<TreasurySummary[]>([]);
  const [byUserSummary, setByUserSummary] = useState<TreasuryByUserSummary[]>([]);
  const [byUserMeta, setByUserMeta] = useState<PaginationMeta>({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'DAILY' | 'MONTHLY'>('DAILY');
  const [ledgerViewMode, setLedgerViewMode] = useState<'LEDGER' | 'BY_USER'>('LEDGER');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [userCache, setUserCache] = useState<Record<number, { name: string; email: string }>>({});
  const [byUserPage, setByUserPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<TreasuryByUserSummary | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userTransactions, setUserTransactions] = useState<LedgerItem[]>([]);
  const [userTransactionsMeta, setUserTransactionsMeta] = useState<PaginationMeta>({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [userTransactionsPage, setUserTransactionsPage] = useState(1);
  const [userTransactionsFlowType, setUserTransactionsFlowType] = useState<'ALL' | 'PIX_IN' | 'PIX_OUT'>('ALL');
  const [loadingUserTransactions, setLoadingUserTransactions] = useState(false);

  const getEffectiveDateRange = () => {
    const now = new Date();

    if (viewMode === 'DAILY') {
      const from = new Date(now);
      from.setHours(0, 0, 0, 0);

      return {
        from: dateFrom || from.toISOString().split('T')[0],
        to: dateTo || now.toISOString().split('T')[0]
      };
    }

    const from = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      from: dateFrom || from.toISOString().split('T')[0],
      to: dateTo || now.toISOString().split('T')[0]
    };
  };

  const fetchData = async () => {
    setLoading(true);

    try {
      const effectiveRange = getEffectiveDateRange();
      const ledgerParams: any = { limit: 100 };
      if (effectiveRange.from) ledgerParams.from = effectiveRange.from;
      if (effectiveRange.to) ledgerParams.to = effectiveRange.to;

      const summaryParams: any = {};
      if (effectiveRange.from) summaryParams.from = effectiveRange.from;
      if (effectiveRange.to) summaryParams.to = effectiveRange.to;

      const [bal, led, daily, monthly, byUser] = await Promise.all([
        api.admin.treasury.getBalance().catch((err) => {
          console.error('[Treasury] Erro ao buscar saldo:', err);
          return { amount: 0, currency: 'BRL' };
        }),
        api.admin.treasury.getLedger(ledgerParams).catch((err) => {
          console.error('[Treasury] Erro ao buscar ledger:', err);
          return [];
        }),
        api.admin.treasury.getDailySummary(summaryParams.from, summaryParams.to).catch((err) => {
          console.error('[Treasury] Erro ao buscar summary diário:', err);
          return [];
        }),
        api.admin.treasury.getMonthlySummary(summaryParams.from, summaryParams.to).catch((err) => {
          console.error('[Treasury] Erro ao buscar summary mensal:', err);
          return [];
        }),
        api.admin.treasury.getByUserSummary({
          from: summaryParams.from,
          to: summaryParams.to,
          page: byUserPage,
          pageSize: 20
        }).catch((err) => {
          console.error('[Treasury] Erro ao buscar summary por usuário:', err);
          return { items: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 } };
        })
      ]);

      // console.log('[Treasury] Dados recebidos:', { ... }); // Removed for security

      setBalance({
        amount: Number(bal?.amount ?? 0),
        currency: bal?.currency || 'BRL'
      });

      const ledgerArray = Array.isArray(led) ? led : [];
      
      // Função para extrair userId da descrição quando não vier do backend
      const extractUserIdFromDescription = (description: string): number | null => {
        const match = description.match(/user (\d+)/i);
        return match ? parseInt(match[1], 10) : null;
      };
      
      // Função para padronizar descrições antigas
      const normalizeDescription = (description: string): string => {
        // OTC Withdrawal Fee from user X - R$ Y (Z USDT) → Taxa de Transação - Saque OTC - Usuário X - R$ Y (Z USDT)
        const otcWithdrawalMatch = description.match(/OTC Withdrawal Fee from user (\d+)(.+)/i);
        if (otcWithdrawalMatch) {
          return `Taxa de Transação - Saque OTC - Usuário ${otcWithdrawalMatch[1]}${otcWithdrawalMatch[2]}`;
        }
        
        // OTC Conversion Fee from user X → Taxa de Conversão OTC - Usuário X
        const otcConversionMatch = description.match(/OTC Conversion Fee from user (\d+)/i);
        if (otcConversionMatch) {
          return `Taxa de Conversão OTC - Usuário ${otcConversionMatch[1]}`;
        }
        
        return description;
      };
      
      // Enriquecer ledger com userId extraído da descrição quando necessário
      const ledgerWithUserIds = ledgerArray.map(item => {
        const normalizedDescription = normalizeDescription(item.description);
        const userId = item.userId || extractUserIdFromDescription(item.description);
        
        return {
          ...item,
          description: normalizedDescription,
          userId: userId || item.userId
        };
      });
      
      // Buscar informações de usuários que não têm userName/userEmail
      const userIdsToFetch = ledgerWithUserIds
        .filter(item => item.userId && (!item.userName || !item.userEmail))
        .map(item => Number(item.userId)) // Garantir que é number
        .filter((id, index, self) => !isNaN(id) && self.indexOf(id) === index); // unique e válidos

      console.log('[Treasury] User IDs to fetch:', userIdsToFetch);

      // Buscar informações dos usuários em paralelo
      const newUserCache = { ...userCache };
      await Promise.all(
        userIdsToFetch.map(async (userId) => {
          if (!newUserCache[userId]) {
            try {
              console.log(`[Treasury] Fetching user ${userId}`);
              const user = await api.admin.users.get(userId);
              console.log(`[Treasury] User ${userId} data:`, user);
              if (user) {
                newUserCache[userId] = {
                  name: user.name || `Usuário #${userId}`,
                  email: user.email || ''
                };
              }
            } catch (err) {
              console.error(`Erro ao buscar usuário ${userId}:`, err);
            }
          }
        })
      );
      setUserCache(newUserCache);
      console.log('[Treasury] User cache:', newUserCache);

      // Enriquecer ledger com informações de usuários do cache
      const enrichedLedger = ledgerWithUserIds.map(item => {
        if (item.userId) {
          const userIdNum = Number(item.userId);
          if (!item.userName && newUserCache[userIdNum]) {
            console.log(`[Treasury] Enriching item ${item.id} with user ${userIdNum}:`, newUserCache[userIdNum]);
            return {
              ...item,
              userName: newUserCache[userIdNum].name,
              userEmail: newUserCache[userIdNum].email
            };
          }
        }
        return item;
      });
      console.log('[Treasury] Enriched ledger sample:', enrichedLedger.slice(0, 3));

      setLedger(enrichedLedger);
      setDailySummary(Array.isArray(daily) ? daily : []);
      setMonthlySummary(Array.isArray(monthly) ? monthly : []);
      setByUserSummary(Array.isArray(byUser?.items) ? byUser.items : []);
      setByUserMeta(byUser?.meta || { page: 1, pageSize: 20, total: 0, totalPages: 1 });
    } catch (e) {
      console.error("Erro ao buscar dados da tesouraria:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [viewMode, dateFrom, dateTo, byUserPage]);

  useEffect(() => {
    setByUserPage(1);
  }, [dateFrom, dateTo]);

  const normalizeText = (value?: string | null) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  const matchesUserTransactionsFlowType = (tx: LedgerItem, flowType: 'ALL' | 'PIX_IN' | 'PIX_OUT') => {
    if (flowType === 'ALL') return true;

    const description = normalizeText(tx.description);
    const transactionType = normalizeText(tx.transactionType);
    const feeType = normalizeText(tx.feeType);
    const txType = normalizeText(tx.type);

    if (flowType === 'PIX_IN') {
      return (
        description.includes('pix in') ||
        description.includes('entrada pix') ||
        transactionType.includes('pix_in') ||
        transactionType.includes('pix in') ||
        feeType.includes('pix_in') ||
        feeType.includes('pix in') ||
        txType === 'pix_in'
      );
    }

    return (
      description.includes('saque pix') ||
      description.includes('pix out') ||
      description.includes('withdraw') ||
      transactionType.includes('pix_out') ||
      transactionType.includes('pix out') ||
      feeType.includes('pix_out') ||
      feeType.includes('pix out') ||
      txType === 'pix_out'
    );
  };

  const fetchUserTransactions = async (user: TreasuryByUserSummary, page: number = 1) => {
    try {
      const effectiveRange = getEffectiveDateRange();
      setLoadingUserTransactions(true);
      const result = await api.admin.treasury.getByUserTransactions(user.userId, {
        from: effectiveRange.from || undefined,
        to: effectiveRange.to || undefined,
        page,
        pageSize: 20,
        flowType: userTransactionsFlowType,
      });

      const rawItems = Array.isArray(result.items) ? result.items : [];
      const filteredItems = rawItems.filter((tx) => matchesUserTransactionsFlowType(tx, userTransactionsFlowType));

      setUserTransactions(filteredItems);

      if (userTransactionsFlowType === 'ALL') {
        setUserTransactionsMeta(result.meta || { page: 1, pageSize: 20, total: 0, totalPages: 1 });
      } else {
        setUserTransactionsMeta({
          page: 1,
          pageSize: filteredItems.length || 20,
          total: filteredItems.length,
          totalPages: 1,
        });
      }
    } catch (err) {
      console.error('[Treasury] Erro ao buscar transações do usuário:', err);
      setUserTransactions([]);
      setUserTransactionsMeta({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
    } finally {
      setLoadingUserTransactions(false);
    }
  };

  const openUserTransactionsModal = async (user: TreasuryByUserSummary) => {
    setSelectedUser(user);
    setShowUserModal(true);
    setUserTransactionsPage(1);
    setUserTransactionsFlowType('ALL');
    await fetchUserTransactions(user, 1);
  };

  const closeUserModal = () => {
    setShowUserModal(false);
    setSelectedUser(null);
    setUserTransactions([]);
    setUserTransactionsMeta({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
    setUserTransactionsPage(1);
    setUserTransactionsFlowType('ALL');
  };

  useEffect(() => {
    if (!showUserModal || !selectedUser) return;
    setUserTransactionsPage(1);
    fetchUserTransactions(selectedUser, 1);
  }, [userTransactionsFlowType]);

  useEffect(() => {
    if (!showUserModal) return;

    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [showUserModal]);

  const formatMoney = (value: number) => Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const safeDate = (value: any) => {
    if (!value) return new Date('Invalid');
    const d = new Date(value);
    if (isNaN(d.getTime())) return new Date('Invalid');
    return d;
  };

  const userTransactionsTotal = userTransactions.reduce((acc, tx) => {
    const amount = Number(tx.amount || 0);
    if (!Number.isFinite(amount)) return acc;
    return (tx.type || '').includes('DEBIT') ? acc - amount : acc + amount;
  }, 0);

  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let fileSuffix = 'ledger';

    if (ledgerViewMode === 'BY_USER') {
      if (byUserSummary.length === 0) {
        alert('Nenhum dado por usuário para exportar.');
        return;
      }

      headers = ['User ID', 'Usuário', 'Email', 'Arrecadado', 'Estornos', 'Líquido', 'Operações'];
      rows = byUserSummary.map(item => [
        item.userId,
        `"${item.userName || `Usuário #${item.userId}`}"`,
        item.userEmail || 'N/A',
        Number(item.totalCollected || 0).toFixed(2),
        Number(item.totalReversed || 0).toFixed(2),
        Number(item.netCollected || 0).toFixed(2),
        item.operations
      ]);
      fileSuffix = 'por-usuario';
    } else {
      if (ledger.length === 0) {
        alert('Nenhum dado de ledger para exportar.');
        return;
      }

      headers = ['ID', 'Data', 'Descrição', 'Usuário', 'Email do Usuário', 'Tipo', 'Valor'];
      rows = ledger.map(item => [
        item.id,
        safeDate(item.created_at).toString() !== 'Invalid'
          ? safeDate(item.created_at).toLocaleString('pt-BR')
          : '--/--',
        `"${item.description}"`,
        item.userName || `Usuário #${item.userId || 'N/A'}`,
        item.userEmail || 'N/A',
        item.type,
        `${(item.type || '').includes('DEBIT') ? '-' : '+'}${Number(item.amount).toFixed(2)}`
      ]);
      fileSuffix = 'ledger';
    }

    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `tesouraria_${fileSuffix}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const visibleSummary = (() => {
    const source = viewMode === 'DAILY' ? dailySummary : monthlySummary;
    const limit = viewMode === 'DAILY' ? 1 : 1;

    return [...(Array.isArray(source) ? source : [])]
      .filter(item => !!item && !!item.date)
      .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
      .slice(-limit);
  })();

  const grossTotal = visibleSummary.reduce(
    (acc, cur) => acc + (Number.isFinite(Number(cur?.total_in ?? 0)) ? Number(cur?.total_in ?? 0) : 0),
    0
  );

  const chartData = (() => {
    if (viewMode === 'DAILY') {
      const data = visibleSummary.map(s => ({
        name: safeDate(s.date).toString() !== 'Invalid'
          ? safeDate(s.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
          : '--/--',
        entrada: Number(s.total_in ?? 0),
        saida: Number(s.total_out ?? 0)
      }));

      if (data.length === 0) {
        const d = new Date();
        data.push({
          name: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          entrada: 0,
          saida: 0
        });
      }

      return data;
    }

    const data = visibleSummary.map(s => ({
      name: safeDate(s.date).toString() !== 'Invalid'
        ? safeDate(s.date).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
        : '--/--',
      entrada: Number(s.total_in ?? 0),
      saida: Number(s.total_out ?? 0)
    }));

    if (data.length === 0) {
      const d = new Date();
      data.push({
        name: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        entrada: 0,
        saida: 0
      });
    }

    return data;
  })();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Tesouraria</h2>
          <p className="text-slate-500 text-sm">
            Controle de caixa, lucros e movimentações do Gateway.
          </p>
        </div>

        <div className="flex gap-2">
            <div className="flex bg-white rounded-lg border border-slate-200 p-1">
              <button
                onClick={() => setViewMode('DAILY')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${viewMode === 'DAILY'
                    ? 'bg-pagandu-100 text-pagandu-700'
                    : 'text-slate-500 hover:bg-slate-50'
                  }`}
              >
                Diário
              </button>

              <button
                onClick={() => setViewMode('MONTHLY')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${viewMode === 'MONTHLY'
                    ? 'bg-pagandu-100 text-pagandu-700'
                    : 'text-slate-500 hover:bg-slate-50'
                  }`}
              >
                Mensal
              </button>
            </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium"
            >
              <Filter className="w-4 h-4" />
              Filtros
            </button>
            <button
              onClick={() => handleExportCSV()}
              className="flex items-center gap-2 px-4 py-2 bg-pagandu-600 text-white rounded-lg hover:bg-pagandu-700 text-sm font-medium shadow-sm"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden text-white">
          <p className="text-sm font-medium text-slate-400">
            Saldo Total da Tesouraria
          </p>

          {loading ? (
            <div className="h-10 mt-2 bg-slate-800 rounded animate-pulse w-48"></div>
          ) : (
            <h3 className="text-4xl font-bold mt-2">
              {balance.currency}{' '}
              {formatMoney(balance.amount)}
            </h3>
          )}


          {!loading && (
            <p className="mt-2 text-sm text-slate-300">
              Total bruto (transações):
              <span className="ml-1 font-semibold text-white">
                {`R$ ${formatMoney(grossTotal)}`}
              </span>
            </p>
          )}

          <p className="text-sm text-green-400 mt-2 font-medium flex items-center gap-1">
            <ArrowUpRight className="w-4 h-4" />
            Atualizado agora
          </p>

          <div className="absolute right-[-20px] top-[-20px] w-48 h-48 bg-pagandu-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <h3 className="text-lg font-bold text-slate-800 mb-6">
            Faturamento ({viewMode === 'DAILY' ? 'Hoje' : 'Mês atual'})
          </h3>

          <div className="h-[200px]">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-slate-300" />
              </div>
            ) : chartData.length > 0 && chartData.some(d => d.entrada > 0 || d.saida > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: 'none' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="entrada" fill="#0d9488" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="saida" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
                <p>Sem dados de faturamento</p>
                <p className="text-xs text-slate-300">
                  {ledger.length === 0
                    ? 'Nenhuma transação de taxa registrada ainda'
                    : 'Nenhuma movimentação no período selecionado'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Filtros de Data
            </h3>
            <button
              onClick={() => setShowFilters(false)}
              className="p-2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Data Inicial
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pagandu-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Data Final
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pagandu-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
            >
              Limpar Filtros
            </button>
            <button
              onClick={() => setShowFilters(false)}
              className="ml-auto px-4 py-2 bg-pagandu-600 text-white rounded-lg hover:bg-pagandu-700 text-sm font-medium"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-800">Visualização de Tesouraria</h3>
          <p className="text-xs text-slate-500 mt-1">Escolha entre ledger geral ou consolidação por usuário.</p>
        </div>
        <div className="flex bg-slate-100 rounded-lg p-1 w-full md:w-auto">
          <button
            onClick={() => setLedgerViewMode('LEDGER')}
            className={`flex-1 md:flex-initial px-4 py-2 text-xs font-bold rounded-md transition-colors ${ledgerViewMode === 'LEDGER'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            Ledger Geral
          </button>
          <button
            onClick={() => setLedgerViewMode('BY_USER')}
            className={`flex-1 md:flex-initial px-4 py-2 text-xs font-bold rounded-md transition-colors ${ledgerViewMode === 'BY_USER'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            Por Usuário
          </button>
        </div>
      </div>

      {ledgerViewMode === 'BY_USER' && (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-800">Arrecadação por Usuário</h3>
            <p className="text-xs text-slate-500 mt-1">
              Consolidado de taxas creditadas na tesouraria por usuário no período selecionado.
            </p>
          </div>
          <div className="text-sm text-slate-700 font-medium">
            Total no período:{' '}
            <span className="font-bold text-slate-900">
              R$ {formatMoney(byUserSummary.reduce((acc, cur) => acc + Number(cur.totalCollected || 0), 0))}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Usuário</th>
                <th className="px-6 py-3 text-right">Arrecadado</th>
                <th className="px-6 py-3 text-right">Estornos</th>
                <th className="px-6 py-3 text-right">Líquido</th>
                <th className="px-6 py-3 text-right">Operações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                  </td>
                </tr>
              ) : byUserSummary.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Nenhuma arrecadação por usuário encontrada para este período.
                  </td>
                </tr>
              ) : (
                byUserSummary.map((item) => (
                  <tr
                    key={item.userId}
                    className="hover:bg-slate-50/50 cursor-pointer"
                    onClick={() => openUserTransactionsModal(item)}
                    title="Clique para ver as transações deste usuário"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-800">{item.userName || `Usuário #${item.userId}`}</span>
                        {item.userEmail ? (
                          <span className="text-xs text-slate-500">{item.userEmail}</span>
                        ) : (
                          <span className="text-xs text-slate-400">ID: {item.userId}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-medium text-emerald-700">
                      R$ {formatMoney(item.totalCollected || 0)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-medium text-rose-700">
                      R$ {formatMoney(item.totalReversed || 0)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-semibold text-slate-900">
                      R$ {formatMoney(item.netCollected || 0)}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-600">{item.operations}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && byUserMeta.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Página {byUserMeta.page} de {byUserMeta.totalPages} • {byUserMeta.total} usuários
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setByUserPage((p) => Math.max(1, p - 1))}
                disabled={byUserMeta.page <= 1}
                className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-200 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => setByUserPage((p) => Math.min(byUserMeta.totalPages, p + 1))}
                disabled={byUserMeta.page >= byUserMeta.totalPages}
                className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-200 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {ledgerViewMode === 'LEDGER' && (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Últimos Lançamentos (Ledger)</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">Data</th>
                <th className="px-6 py-3">Descrição</th>
                <th className="px-6 py-3">Usuário</th>
                <th className="px-6 py-3">Tipo</th>
                <th className="px-6 py-3 text-right">Valor</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                  </td>
                </tr>
              ) : ledger.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Nenhum lançamento encontrado.
                  </td>
                </tr>
              ) : (
                ledger
                  .filter(item => !!item)
                  .map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-mono text-xs">{item.id}</td>

                      <td className="px-6 py-4">
                        {safeDate(item.created_at).toString() !== 'Invalid'
                          ? safeDate(item.created_at).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                          : '--/--'}
                      </td>

                      <td className="px-6 py-4 font-medium">
                        {item.description}
                      </td>

                      <td className="px-6 py-4">
                        {item.userId ? (
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-800">
                              {item.userName || `Usuário #${item.userId}`}
                            </span>
                            {item.userEmail && (
                              <span className="text-xs text-slate-500">
                                {item.userEmail}
                              </span>
                            )}
                            {!item.userName && !item.userEmail && (
                              <span className="text-xs text-slate-400">
                                ID: {item.userId}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">-</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${(item.type || '').includes('CREDIT')
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                            }`}
                        >
                          {item.type}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right font-mono font-medium">
                        {(item.type || '').includes('DEBIT') ? '-' : '+'}
                        R${' '}
                        {formatMoney(item.amount)}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {showUserModal && selectedUser && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-slate-950/55 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
          style={{ width: '100vw', height: '100vh' }}
        >
          <div className="w-full max-w-5xl h-auto max-h-[92vh] overflow-hidden bg-white rounded-3xl border border-slate-200/80 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.55)] flex flex-col relative">
            <div className="sm:hidden pt-2 pb-1 flex justify-center">
              <span className="h-1.5 w-14 rounded-full bg-slate-300" />
            </div>

            <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Transações do Usuário</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  {selectedUser.userName || `Usuário #${selectedUser.userId}`} • ID {selectedUser.userId}
                </p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <select
                  value={userTransactionsFlowType}
                  onChange={(e) => setUserTransactionsFlowType(e.target.value as 'ALL' | 'PIX_IN' | 'PIX_OUT')}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:ring-2 focus:ring-pagandu-500 focus:border-pagandu-400 outline-none flex-1 sm:flex-none shadow-sm"
                >
                  <option value="ALL">Todos os fluxos</option>
                  <option value="PIX_IN">Somente PIX IN</option>
                  <option value="PIX_OUT">Somente PIX OUT</option>
                </select>

                <button
                  onClick={closeUserModal}
                  className="p-2.5 text-slate-400 hover:text-slate-700 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                  aria-label="Fechar modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-5 overflow-auto flex-1 bg-gradient-to-b from-white to-slate-50/40">
              {loadingUserTransactions ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                </div>
              ) : userTransactions.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl">
                  Nenhuma transação encontrada para esse usuário no período.
                </div>
              ) : (
                <>
                  <div className="md:hidden space-y-3">
                    {userTransactions.map((tx) => (
                      <article key={tx.id} className="rounded-2xl border border-slate-200 p-3.5 bg-white shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${(tx.type || '').includes('CREDIT')
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                            }`}>
                            {tx.type}
                          </span>
                          <span className="text-sm font-mono font-semibold text-slate-900 tracking-tight">
                            {(tx.type || '').includes('DEBIT') ? '-' : '+'}R$ {formatMoney(tx.amount)}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-800 leading-snug break-words">{tx.description}</p>
                        <p className="text-xs text-slate-500 mt-2">
                          {safeDate(tx.created_at).toString() !== 'Invalid'
                            ? safeDate(tx.created_at).toLocaleString('pt-BR')
                            : '--/--'}
                        </p>
                      </article>
                    ))}
                  </div>

                  <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50/90 border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 font-semibold text-slate-600">Data</th>
                          <th className="px-4 py-3 font-semibold text-slate-600">Descrição</th>
                          <th className="px-4 py-3 font-semibold text-slate-600">Tipo</th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-600">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {userTransactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3">
                              {safeDate(tx.created_at).toString() !== 'Invalid'
                                ? safeDate(tx.created_at).toLocaleString('pt-BR')
                                : '--/--'}
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-800">{tx.description}</td>
                            <td className="px-4 py-3">
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${(tx.type || '').includes('CREDIT')
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-rose-100 text-rose-700'
                                }`}>
                                {tx.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                              {(tx.type || '').includes('DEBIT') ? '-' : '+'}R$ {formatMoney(tx.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div className="px-4 sm:px-6 py-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Página {userTransactionsMeta.page} de {userTransactionsMeta.totalPages} • {userTransactionsMeta.total} transações
                </p>
                {!loadingUserTransactions && (
                  <p className="text-sm font-bold text-slate-900 mt-1 tracking-tight">
                    Somatório total: {(userTransactionsTotal < 0 ? '-R$ ' : 'R$ ')}{formatMoney(Math.abs(userTransactionsTotal))}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={async () => {
                    if (!selectedUser) return;
                    const nextPage = Math.max(1, userTransactionsPage - 1);
                    setUserTransactionsPage(nextPage);
                    await fetchUserTransactions(selectedUser, nextPage);
                  }}
                  disabled={loadingUserTransactions || userTransactionsMeta.page <= 1}
                  className="px-3 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none transition-colors"
                >
                  Anterior
                </button>
                <button
                  onClick={async () => {
                    if (!selectedUser) return;
                    const nextPage = Math.min(userTransactionsMeta.totalPages, userTransactionsPage + 1);
                    setUserTransactionsPage(nextPage);
                    await fetchUserTransactions(selectedUser, nextPage);
                  }}
                  disabled={loadingUserTransactions || userTransactionsMeta.page >= userTransactionsMeta.totalPages}
                  className="px-3 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none transition-colors"
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

