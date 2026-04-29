
import React, { useEffect, useState } from 'react';
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
import { TreasuryBalance, LedgerItem, TreasurySummary, TreasuryByUserSummary, PáginationMeta } from '../types/index';

export const Treasury: React.FC = () => {
  const [balance, setBalance] = useState<TreasuryBalance>({
    amount: 0,
    currency: 'BRL'
  });

  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [dailySummary, setDailySummary] = useState<TreasurySummary[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<TreasurySummary[]>([]);
  const [byUserSummary, setByUserSummary] = useState<TreasuryByUserSummary[]>([]);
  const [byUserMeta, setByUserMeta] = useState<PáginationMeta>({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'DAILY' | 'MONTHLY'>('DAILY');
  const [ledgerViewMode, setLedgerViewMode] = useState<'LEDGER' | 'BY_USER'>('LEDGER');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [byUserSearch, setByUserSearch] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [userCache, setUserCache] = useState<Record<number, { name: string; email: string }>>({});
  const [byUserPage, setByUserPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<TreasuryByUserSummary | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userTransactions, setUserTransactions] = useState<LedgerItem[]>([]);
  const [userTransactionsMeta, setUserTransactionsMeta] = useState<PáginationMeta>({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [userTransactionsFilteredSubtotal, setUserTransactionsFilteredSubtotal] = useState(0);
  const [userTransactionsPage, setUserTransactionsPage] = useState(1);
  const [userTransactionsFlowType, setUserTransactionsFlowType] = useState<'ALL' | 'PIX_IN' | 'PIX_OUT' | 'ESTORNO'>('ALL');
  const [userTxFrom, setUserTxFrom] = useState<string>('');
  const [userTxTo, setUserTxTo] = useState<string>('');
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
          console.error('[Treasury] Erro ao buscar summary dirio:', err);
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
          pageSize: 20,
          search: byUserSearch || undefined,
        }).catch((err) => {
          console.error('[Treasury] Erro ao buscar summary por usurio:', err);
          return { items: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 } };
        })
      ]);

      // console.log('[Treasury] Dados recebidos:', { ... }); // Removed for security

      setBalance({
        amount: Number(bal?.amount ?? 0),
        currency: bal?.currency || 'BRL'
      });

      const ledgerArray = Array.isArray(led) ? led : [];
      
      // Funo para extrair userId da descrio quando no vier do backend
      const extractUserIdFromDescription = (description: string): number | null => {
        const match = description.match(/user (\d+)/i);
        return match ? parseInt(match[1], 10) : null;
      };
      
      // Funo para padronizar descries antigas
      const normalizeDescription = (description: string): string => {
        // OTC Withdrawal Fee from user X - R$ Y (Z USDT) ? Taxa de Transação - Saque OTC - Usurio X - R$ Y (Z USDT)
        const otcWithdrawalMatch = description.match(/OTC Withdrawal Fee from user (\d+)(.+)/i);
        if (otcWithdrawalMatch) {
          return `Taxa de Transação - Saque OTC - Usurio ${otcWithdrawalMatch[1]}${otcWithdrawalMatch[2]}`;
        }
        
        // OTC Conversion Fee from user X ? Taxa de Converso OTC - Usurio X
        const otcConversionMatch = description.match(/OTC Conversion Fee from user (\d+)/i);
        if (otcConversionMatch) {
          return `Taxa de Converso OTC - Usurio ${otcConversionMatch[1]}`;
        }
        
        return description;
      };
      
      // Enriquecer ledger com userId extrado da descrio quando necessrio
      const ledgerWithUserIds = ledgerArray.map(item => {
        const normalizedDescription = normalizeDescription(item.description);
        const userId = item.userId || extractUserIdFromDescription(item.description);
        
        return {
          ...item,
          description: normalizedDescription,
          userId: userId || item.userId
        };
      });
      
      // Buscar informaes de usurios que no tm userName/userEmail
      const userIdsToFetch = ledgerWithUserIds
        .filter(item => item.userId && (!item.userName || !item.userEmail))
        .map(item => Number(item.userId)) // Garantir que  number
        .filter((id, index, self) => !isNaN(id) && self.indexOf(id) === index); // unique e vlidos

      console.log('[Treasury] User IDs to fetch:', userIdsToFetch);

      // Buscar informaes dos usurios em paralelo
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
                  name: user.name || `Usurio #${userId}`,
                  email: user.email || ''
                };
              }
            } catch (err) {
              console.error(`Erro ao buscar usurio ${userId}:`, err);
            }
          }
        })
      );
      setUserCache(newUserCache);
      console.log('[Treasury] User cache:', newUserCache);

      // Enriquecer ledger com informaes de usurios do cache
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
  }, [viewMode, dateFrom, dateTo, byUserPage, byUserSearch]);

  useEffect(() => {
    setByUserPage(1);
  }, [dateFrom, dateTo, byUserSearch]);

  const matchesFlowType = (tx: LedgerItem, flowType: 'ALL' | 'PIX_IN' | 'PIX_OUT' | 'ESTORNO') => {
    if (flowType === 'ALL') return true;

    const transactionType = String((tx as any)?.transactionType || '').toUpperCase();
    const description = String(tx?.description || '').toUpperCase();

    if (flowType === 'PIX_IN') {
      return transactionType === 'PIX_IN_FEE' || description.includes('PIX IN');
    }

    if (flowType === 'PIX_OUT') {
      return transactionType === 'PIX_OUT_FEE' || description.includes('SAQUE PIX') || description.includes('PIX OUT');
    }

    if (flowType === 'ESTORNO') {
      return description.includes('ESTORNO') || description.includes('SAQUE REVERTIDO') || String(tx?.type || '').toUpperCase().includes('DEBIT');
    }

    return true;
  };

  const getSignedAmount = (tx: LedgerItem) => {
    const amount = Number(tx?.amount || 0);
    return String(tx?.type || '').toUpperCase().includes('DEBIT') ? -amount : amount;
  };

  const fetchUserTransactions = async (user: TreasuryByUserSummary, page: number = 1) => {
    try {
      // Use modal-specific date filters if set, otherwise fall back to global range
      const dateRange = (userTxFrom || userTxTo) 
        ? { from: userTxFrom, to: userTxTo }
        : getEffectiveDateRange();
      
      setLoadingUserTransactions(true);

      // Fallback robusto: para PIX_IN/PIX_OUT, traz todas as pginas e filtra no frontend por transactionType.
      // Isso evita inconsistncia quando o backend ignora flowType.
      if (userTransactionsFlowType === 'ALL') {
        const pageSize = 100;
        const firstPage = await api.admin.treasury.getByUserTransactions(user.userId, {
          from: dateRange.from || undefined,
          to: dateRange.to || undefined,
          page: 1,
          pageSize,
          flowType: 'ALL',
        });

        const allItems: LedgerItem[] = [...(firstPage.items || [])];
        const totalPages = Number(firstPage.meta?.totalPages || 1);

        for (let currentPage = 2; currentPage <= totalPages; currentPage += 1) {
          const next = await api.admin.treasury.getByUserTransactions(user.userId, {
            from: dateRange.from || undefined,
            to: dateRange.to || undefined,
            page: currentPage,
            pageSize,
            flowType: 'ALL',
          });
          allItems.push(...(next.items || []));
        }

        const uiPageSize = 20;
        const start = (page - 1) * uiPageSize;
        const end = start + uiPageSize;
        const paged = allItems.slice(start, end);
        const allSubtotal = allItems.reduce((acc, tx) => acc + getSignedAmount(tx), 0);

        setUserTransactions(paged);
        setUserTransactionsMeta({
          page,
          pageSize: uiPageSize,
          total: allItems.length,
          totalPages: Math.max(1, Math.ceil(allItems.length / uiPageSize)),
        });
        setUserTransactionsFilteredSubtotal(allSubtotal);
      } else {
        const pageSize = 100;
        const firstPage = await api.admin.treasury.getByUserTransactions(user.userId, {
          from: dateRange.from || undefined,
          to: dateRange.to || undefined,
          page: 1,
          pageSize,
          flowType: 'ALL',
        });

        const allItems: LedgerItem[] = [...(firstPage.items || [])];
        const totalPages = Number(firstPage.meta?.totalPages || 1);

        for (let currentPage = 2; currentPage <= totalPages; currentPage += 1) {
          const next = await api.admin.treasury.getByUserTransactions(user.userId, {
            from: dateRange.from || undefined,
            to: dateRange.to || undefined,
            page: currentPage,
            pageSize,
            flowType: 'ALL',
          });
          allItems.push(...(next.items || []));
        }

        const filtered = allItems.filter((tx) => matchesFlowType(tx, userTransactionsFlowType));
        const uiPageSize = 20;
        const start = (page - 1) * uiPageSize;
        const end = start + uiPageSize;
        const paged = filtered.slice(start, end);
        const filteredTotalPages = Math.max(1, Math.ceil(filtered.length / uiPageSize));
        const filteredSubtotal = filtered.reduce((acc, tx) => acc + getSignedAmount(tx), 0);

        setUserTransactions(paged);
        setUserTransactionsMeta({
          page,
          pageSize: uiPageSize,
          total: filtered.length,
          totalPages: filteredTotalPages,
        });
        setUserTransactionsFilteredSubtotal(filteredSubtotal);
      }
    } catch (err) {
      console.error('[Treasury] Erro ao buscar transações do usurio:', err);
      setUserTransactions([]);
      setUserTransactionsMeta({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
      setUserTransactionsFilteredSubtotal(0);
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
    setUserTransactionsFilteredSubtotal(0);
    setUserTransactionsPage(1);
    setUserTransactionsFlowType('ALL');
    setUserTxFrom('');
    setUserTxTo('');
  };

  useEffect(() => {
    if (!showUserModal || !selectedUser) return;
    setUserTransactionsPage(1);
    fetchUserTransactions(selectedUser, 1);
  }, [userTransactionsFlowType, userTxFrom, userTxTo]);

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

  const filteredLedger = ledger.filter((item) => {
    if (!item) return false;
    const term = String(ledgerSearch || '').trim().toLowerCase();
    if (!term) return true;

    const candidate = [
      item.id,
      item.description,
      item.userName,
      item.userEmail,
      item.userId,
      item.type,
    ]
      .map((v) => String(v ?? '').toLowerCase())
      .join(' ');

    return candidate.includes(term);
  });

  const excelEscape = (value: any) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const formatExcelMoney = (value: number) => Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const downloadXls = (rowsHtml: string, headersHtml: string, fileName: string) => {
    const tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <meta name="ProgId" content="Excel.Sheet" />
        <style>
          table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; }
          th { background: #f3f4f6; font-weight: 700; text-align: left; }
          td.text-right { text-align: right; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>${headersHtml}</tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(["\uFEFF" + tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${fileName}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportXLS = async () => {
    const baseFileName = `tesouraria_${ledgerViewMode === 'BY_USER' ? 'por-usuario' : 'ledger'}_${new Date().toISOString().split('T')[0]}`;

    if (ledgerViewMode === 'BY_USER') {
      const searchTerm = String(byUserSearch || '').trim();
      if (!searchTerm) {
        alert('Digite o nome, email ou ID do usurio para exportar as transações.');
        return;
      }

      const normalizedTerm = searchTerm.toLowerCase();
      let selectedUser: any = null;
      try {
        const allUsers = await api.admin.users.list();
        const matches = (Array.isArray(allUsers) ? allUsers : []).filter((u: any) => {
          const idText = String(u?.id ?? '').toLowerCase();
          const nameText = String(u?.name ?? '').toLowerCase();
          const emailText = String(u?.email ?? '').toLowerCase();
          return idText === normalizedTerm || nameText.includes(normalizedTerm) || emailText.includes(normalizedTerm);
        });

        if (matches.length === 0) {
          alert('Usurio no encontrado para o termo informado.');
          return;
        }

        if (matches.length > 1) {
          alert(`Sua busca retornou ${matches.length} usurios. Refine por nome completo, email ou ID exato para exportar apenas 1 usurio.`);
          return;
        }

        selectedUser = matches[0];
      } catch (err) {
        console.error('[Treasury] Erro ao buscar usurio para exportao:', err);
        alert('Falha ao localizar o usurio para exportao.');
        return;
      }

      const hasManualDateFilter = Boolean(String(dateFrom || '').trim() || String(dateTo || '').trim());
      const fromParam = hasManualDateFilter ? (dateFrom || undefined) : undefined;
      const toParam = hasManualDateFilter ? (dateTo || undefined) : undefined;

      const pageSize = 200;
      const allTransactions: any[] = [];
      try {
        const firstPage = await api.admin.treasury.getByUserGatewayTransactions(Number(selectedUser.id), {
          from: fromParam,
          to: toParam,
          page: 1,
          pageSize,
        });

        allTransactions.push(...(Array.isArray(firstPage?.items) ? firstPage.items : []));

        const totalPages = Number(firstPage?.meta?.totalPages || 1);
        for (let currentPage = 2; currentPage <= totalPages; currentPage += 1) {
          const nextPage = await api.admin.treasury.getByUserGatewayTransactions(Number(selectedUser.id), {
            from: fromParam,
            to: toParam,
            page: currentPage,
            pageSize,
          });
          allTransactions.push(...(Array.isArray(nextPage?.items) ? nextPage.items : []));
        }
      } catch (err) {
        console.error(`[Treasury] Erro ao buscar transações reais do usurio ${selectedUser.id}:`, err);
        alert('Falha ao buscar transações reais do usurio para exportao.');
        return;
      }

      if (allTransactions.length === 0) {
        alert('Nenhuma transao encontrada para o usurio informado no perodo.');
        return;
      }

      const statusLabel = (status: any) => {
        const s = String(status || '').toUpperCase();
        if (!s) return 'Aprovado';
        if (s === 'COMPLETED') return 'Aprovado';
        if (s === 'PAID') return 'Pago';
        if (s === 'PENDING') return 'Processando';
        if (s === 'FAILED') return 'Falhou';
        if (s === 'REFUNDED') return 'Estornado';
        return s;
      };

      const txE2E = (tx: any) => String(tx?.e2e || tx?.endToEnd || tx?.tradeNo || tx?.merOrderNo || tx?.providerOrderNo || '-');

      const isApprovedOrPaid = (status: any) => {
        const s = String(status || '').trim().toUpperCase();
        return s === 'PAID' || s === 'APPROVED' || s === 'COMPLETED' || s === 'SUCCESS' || s === 'SUCCEEDED';
      };

      const resolveTxDate = (tx: any) => {
        const raw = tx?.created_at || tx?.createdAt || tx?.date || tx?.transactionDate || tx?.paid_at || tx?.updated_at;
        const d = safeDate(raw);
        return d.toString() === 'Invalid' ? null : d;
      };

      const exportableTransactions = allTransactions.filter((tx) => isApprovedOrPaid((tx as any)?.status));

      if (exportableTransactions.length === 0) {
        alert('Nenhuma transao com status Aprovado/Pago encontrada para exportar.');
        return;
      }

      const detailedRows: string[] = exportableTransactions.map((tx) => {
        const txDate = resolveTxDate(tx as any);
        const txType = String(tx?.type || '').toUpperCase();
        const isCredit = txType.includes('IN') || txType.includes('DEPOSIT') || txType.includes('CREDIT');
        const grossAmount = Math.abs(Number(tx?.grossAmount ?? tx?.amount ?? 0));
        const feeAmount = Math.abs(Number(tx?.feeAmount ?? 0));
        const totalAmount = Number((isCredit ? (grossAmount - feeAmount) : (grossAmount + feeAmount)).toFixed(2));

        return `
          <tr>
            <td>${excelEscape(tx.id)}</td>
            <td>${excelEscape(txE2E(tx))}</td>
            <td>${excelEscape(txDate ? txDate.toLocaleDateString('pt-BR') : '--/--')}</td>
            <td>${excelEscape(txDate ? txDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--')}</td>
            <td>${excelEscape(tx.description || '-')}</td>
            <td>${excelEscape(isCredit ? 'Entrada' : 'Saida')}</td>
            <td class="text-right" style="mso-number-format:'\\@';">${excelEscape(formatExcelMoney(grossAmount))}</td>
            <td class="text-right" style="mso-number-format:'\\@';">${excelEscape(formatExcelMoney(feeAmount))}</td>
            <td class="text-right" style="mso-number-format:'\\@';">${excelEscape(formatExcelMoney(totalAmount))}</td>
            <td>${excelEscape(statusLabel((tx as any)?.status))}</td>
          </tr>
        `;
      });

      if (detailedRows.length === 0) {
        alert('Nenhuma transao principal encontrada para exportar.');
        return;
      }

      const headersHtml = [
        'ID',
        'E2E',
        'Data',
        'Hora',
        'Descrio',
        'Tipo',
        'Valor',
        'Taxa',
        'Total',
        'Status',
      ].map((h) => `<th>${excelEscape(h)}</th>`).join('');

      downloadXls(detailedRows.join(''), headersHtml, `${baseFileName}_${selectedUser.id}`);
      return;
    }

    if (filteredLedger.length === 0) {
      alert('Nenhum dado de ledger para exportar.');
      return;
    }

    const headersHtml = [
      'ID',
      'Data',
      'Descrio',
      'Usurio',
      'Email do Usurio',
      'Tipo',
      'Valor',
    ].map((h) => `<th>${excelEscape(h)}</th>`).join('');

    const rowsHtml = filteredLedger.map((item) => {
      const sign = (item.type || '').includes('DEBIT') ? '-' : '+';
      return `
        <tr>
          <td>${excelEscape(item.id)}</td>
          <td>${excelEscape(
            safeDate(item.created_at).toString() !== 'Invalid'
              ? safeDate(item.created_at).toLocaleString('pt-BR')
              : '--/--'
          )}</td>
          <td>${excelEscape(item.description)}</td>
          <td>${excelEscape(item.userName || `Usurio #${item.userId || 'N/A'}`)}</td>
          <td>${excelEscape(item.userEmail || 'N/A')}</td>
          <td>${excelEscape(item.type)}</td>
          <td class="text-right" style="mso-number-format:'\\@';">${excelEscape(`${sign}${formatExcelMoney(Number(item.amount || 0))}`)}</td>
        </tr>
      `;
    }).join('');

    downloadXls(rowsHtml, headersHtml, baseFileName);
  };

  const visibleSummary = (() => {
    const source = viewMode === 'DAILY' ? dailySummary : monthlySummary;
    const limit = viewMode === 'DAILY' ? 30 : 12;

    return [...(Array.isArray(source) ? source : [])]
      .filter(item => !!item && !!item.date)
      .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
      .slice(-limit);
  })();

  const grossTotal = (viewMode === 'DAILY' ? dailySummary : monthlySummary).reduce(
    (acc, cur) => acc + (Number.isFinite(Number(cur?.total_in ?? 0)) ? Number(cur?.total_in ?? 0) : 0),
    0
  );

  const byUserGrossTotal = byUserSummary.reduce(
    (acc, cur) => acc + Number(cur?.totalCollected || 0),
    0
  );

  const byUserNetTotal = byUserSummary.reduce(
    (acc, cur) => acc + Number(cur?.netCollected || 0),
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
            Controle de caixa, lucros e movimentaes do Gateway.
          </p>
        </div>

        <div className="flex gap-2">
            <div className="flex bg-white rounded-lg border border-slate-200 p-1">
              <button
                onClick={() => setViewMode('DAILY')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${viewMode === 'DAILY'
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-slate-500 hover:bg-slate-50'
                  }`}
              >
                Diário
              </button>

              <button
                onClick={() => setViewMode('MONTHLY')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${viewMode === 'MONTHLY'
                    ? 'bg-orange-100 text-orange-700'
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
              onClick={() => handleExportXLS()}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium shadow-sm"
            >
              <Download className="w-4 h-4" />
              Exportar XLS
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
              Total lquido (por usurio):
              <span className="ml-1 font-semibold text-white">
                {`R$ ${formatMoney(byUserNetTotal)}`}
              </span>
            </p>
          )}

          <p className="text-sm text-green-400 mt-2 font-medium flex items-center gap-1">
            <ArrowUpRight className="w-4 h-4" />
            Atualizado agora
          </p>

          <div className="absolute right-[-20px] top-[-20px] w-48 h-48 bg-orange-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <h3 className="text-lg font-bold text-slate-800 mb-6">
            Faturamento ({viewMode === 'DAILY' ? 'Hoje' : 'Ms atual'})
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
                    ? 'Nenhuma transao de taxa registrada ainda'
                    : 'Nenhuma movimentao no perodo selecionado'}
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
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
              className="ml-auto px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-800">Visualizao de Tesouraria</h3>
          <p className="text-xs text-slate-500 mt-1">Escolha entre ledger geral ou consolidao por usurio.</p>
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
            Por Usurio
          </button>
        </div>
      </div>

      {ledgerViewMode === 'BY_USER' && (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-800">Arrecadao por Usurio</h3>
            <p className="text-xs text-slate-500 mt-1">
              Consolidado de taxas creditadas na tesouraria por usurio no perodo selecionado.
            </p>
            <div className="mt-3">
              <input
                type="text"
                value={byUserSearch}
                onChange={(e) => setByUserSearch(e.target.value)}
                placeholder="Filtrar por nome, email ou ID do usurio"
                className="w-full md:w-80 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="text-sm text-slate-700 font-medium">
            Total lquido no perodo:{' '}
            <span className="font-bold text-slate-900">
              R$ {formatMoney(byUserNetTotal)}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Usurio</th>
                <th className="px-6 py-3 text-right">Arrecadado</th>
                <th className="px-6 py-3 text-right">Estornos</th>
                <th className="px-6 py-3 text-right">Líquido</th>
                <th className="px-6 py-3 text-right">Operaes</th>
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
                    Nenhuma arrecadao por usurio encontrada para estáodo.
                  </td>
                </tr>
              ) : (
                byUserSummary.map((item) => (
                  <tr
                    key={item.userId}
                    className="hover:bg-slate-50/50 cursor-pointer"
                    onClick={() => openUserTransactionsModal(item)}
                    title="Clique para ver as transações destário"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-800">{item.userName || `Usurio #${item.userId}`}</span>
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
                    <td className="px-6 py-4 text-right text-slate-600">{item.operaçãos}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && byUserMeta.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Página {byUserMeta.page} de {byUserMeta.totalPages}  {byUserMeta.total} usurios
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
                Prxima
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {ledgerViewMode === 'LEDGER' && (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h3 className="font-bold text-slate-800">últimos Lanamentos (Ledger)</h3>
          <input
            type="text"
            value={ledgerSearch}
            onChange={(e) => setLedgerSearch(e.target.value)}
            placeholder="Filtrar no ledger por usurio, email, descrio ou ID"
            className="w-full md:w-96 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">Data</th>
                <th className="px-6 py-3">Descrio</th>
                <th className="px-6 py-3">Usurio</th>
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
              ) : filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Nenhum lanamento encontrado.
                  </td>
                </tr>
              ) : (
                filteredLedger
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
                              {item.userName || `Usurio #${item.userId}`}
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
                              : 'bg-orange-100 text-orange-700'
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

      {showUserModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Transaes do Usurio</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {selectedUser.userName || `Usurio #${selectedUser.userId}`}  ID {selectedUser.userId}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="date"
                  value={userTxFrom}
                  max={userTxTo || undefined}
                  onChange={(e) => setUserTxFrom(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none"
                  title="Data inicial (deixe vazio para remover filtro)"
                />
                <span className="text-xs text-slate-400">at</span>
                <input
                  type="date"
                  value={userTxTo}
                  min={userTxFrom || undefined}
                  onChange={(e) => setUserTxTo(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none"
                  title="Data final (deixe vazio para remover filtro)"
                />
                <select
                  value={userTransactionsFlowType}
                  onChange={(e) => setUserTransactionsFlowType(e.target.value as 'ALL' | 'PIX_IN' | 'PIX_OUT' | 'ESTORNO')}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  <option value="ALL">Todos os fluxos</option>
                  <option value="PIX_IN">Somente PIX IN</option>
                  <option value="PIX_OUT">Somente PIX OUT</option>
                  <option value="ESTORNO">Somente Estorno</option>
                </select>

                <button
                  onClick={closeUserModal}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-md"
                  aria-label="Fechar modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-auto max-h-[60vh]">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Descrio</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingUserTransactions ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                      </td>
                    </tr>
                  ) : userTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-500">
                        Nenhuma transao encontrada para esse usurio no perodo.
                      </td>
                    </tr>
                  ) : (
                    userTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          {safeDate(tx.created_at).toString() !== 'Invalid'
                            ? safeDate(tx.created_at).toLocaleString('pt-BR')
                            : '--/--'}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">{tx.description}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${(tx.type || '').includes('CREDIT')
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                            }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium">
                          {(tx.type || '').includes('DEBIT') ? '-' : '+'}R$ {formatMoney(tx.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">
                  Página {userTransactionsMeta.page} de {userTransactionsMeta.totalPages}  {userTransactionsMeta.total} transações
                </p>
                <p className="text-xs font-semibold text-slate-700 mt-1">
                  Subtotal do filtro: {userTransactionsFilteredSubtotal < 0 ? '-R$ ' : 'R$ '}{formatMoney(Math.abs(userTransactionsFilteredSubtotal))}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (!selectedUser) return;
                    const nextPage = Math.max(1, userTransactionsPage - 1);
                    setUserTransactionsPage(nextPage);
                    await fetchUserTransactions(selectedUser, nextPage);
                  }}
                  disabled={loadingUserTransactions || userTransactionsMeta.page <= 1}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-200 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-200 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Prxima
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


