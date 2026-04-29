
import React, { useEffect, useState } from 'react';
import { AppView, UserStatus, DocStatus } from '../types/index';
import { api } from '../services/api';
import {
  TrendingUp,
  Users,
  AlertCircle,
  DollarSign,
  ArrowRight,
  Loader2,
  Calendar
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface DashboardProps {
  onViewChange: (view: AppView) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onViewChange }) => {
  const [stats, setStats] = useState({
    activeClients: 0,
    pendingApprovals: 0,
    blockedClients: 0,
    treasuryBalance: 0,
    grossTransactionsTotal: 0,
    loading: true
  });

  const [chartData, setChartData] = useState<any[]>([]);

  const safeDate = (value: any) => {
    if (!value) return new Date('Invalid');
    const d = new Date(value);
    if (isNaN(d.getTime())) return new Date('Invalid');
    return d;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [users, treasuryBal, dailySummary] = await Promise.all([
          api.admin.users.list().catch((err) => {
            console.error('[Dashboard] Erro ao buscar usuários:', err);
            return [];
          }),
          api.admin.treasury.getBalance().catch((err) => {
            console.error('[Dashboard] Erro ao buscar saldo da tesouraria:', err);
            return { amount: 0 };
          }),
          api.admin.treasury.getDailySummary().catch((err) => {
            console.error('[Dashboard] Erro ao buscar summary diário:', err);
            return [];
          })
        ]);

        // console.log('[Dashboard] Dados recebidos:', { ... }); // Removed for security

        const safeUsers = Array.isArray(users) ? users.filter(u => !!u) : [];

        const activeCount = safeUsers.filter(u => u.status === UserStatus.ACTIVE).length;

        const pendingCount = safeUsers.filter(u =>
          u.status === UserStatus.PENDING ||
          (u.doc_status && u.doc_status !== DocStatus.APPROVED)
        ).length;

        const blockedCount = safeUsers.filter(u => u.status === UserStatus.BLOCKED).length;


        let processedChartData = [];
        let grossTotal = 0;

        if (Array.isArray(dailySummary) && dailySummary.length > 0) {
          processedChartData = dailySummary
            .filter(item => !!item && !!item.date && Number(item.total_in ?? 0) > 0)
            .map(item => {
              const d = safeDate(item.date);
              return {
                name: d.toString() !== 'Invalid'
                  ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                  : '--/--',
                value: Number(item.total_in ?? 0)
              };
            })
            .slice(0, 7) // Últimos 7 dias
            .reverse(); // Ordenar do mais antigo para o mais recente

          const arr = Array.isArray(dailySummary) ? dailySummary : [];
          grossTotal = arr.reduce((acc: number, cur: any) => {
            const v = Number(cur?.total_in ?? 0);
            return acc + (Number.isFinite(v) ? v : 0);
          }, 0);
        }

        // Se não houver dados, criar dados vazios para os últimos 7 dias
        if (processedChartData.length === 0) {
          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            processedChartData.push({
              name: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
              value: 0
            });
          }
        }

        // console.log('[Dashboard] Chart data processado:', processedChartData); // Removed for security

        setStats({
          activeClients: activeCount,
          pendingApprovals: pendingCount,
          blockedClients: blockedCount,
          treasuryBalance: Number(treasuryBal?.amount ?? 0),
          grossTransactionsTotal: Number(grossTotal ?? 0),
          loading: false
        });

        setChartData(processedChartData);
      } catch (error) {
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-8 w-full overflow-x-hidden">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-4xl font-bold text-slate-900">Visão Geral</h1>
        <p className="text-slate-600 mt-2">Resumo da operação em tempo real do seu sistema</p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full">

        {/* Treasury Card */}
        <div className="bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-lg text-white relative overflow-hidden min-w-0 group hover:shadow-xl transition-shadow">
          <div className="absolute right-0 top-0 w-40 h-40 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/10 transition-all duration-300"></div>
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-slate-400 flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4" /> Tesouraria
                </p>
                {stats.loading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
                ) : (
                  <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight break-words leading-tight">
                    R$ {Number(stats.treasuryBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </h2>
                )}
              </div>
              <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>

            {!stats.loading && (
              <div className="pt-4 border-t border-white/10">
                <p className="text-sm text-slate-400 mb-1">Total bruto (transações)</p>
                <p className="text-xl font-semibold text-white break-words leading-tight">
                  R$ {Number(stats.grossTransactionsTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}

            <button
              onClick={() => onViewChange(AppView.TREASURY)}
              className="mt-6 inline-flex items-center gap-2 text-fluxabank-300 hover:text-white font-medium text-sm transition-colors group/btn"
            >
              Ver detalhes <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Usuarios Ativos */}
        <div
          className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all cursor-pointer min-w-0 group"
          onClick={() => onViewChange(AppView.CLIENTS)}
        >
          <div className="flex items-start justify-between mb-4">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">Usuários Ativos</p>
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center group-hover:shadow-md transition-shadow">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>

          {stats.loading ? (
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          ) : (
            <>
              <h3 className="text-3xl font-bold text-slate-900">{stats.activeClients}</h3>
              <p className="text-xs text-slate-500 mt-3">Contas com acesso completo</p>
            </>
          )}
        </div>

        {/* Pendentes */}
        <div
          className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all cursor-pointer min-w-0 group"
          onClick={() => onViewChange(AppView.APPROVALS)}
        >
          <div className="flex items-start justify-between mb-4">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">Pendentes</p>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center group-hover:shadow-md transition-shadow ${stats.pendingApprovals > 0 ? 'bg-amber-100' : 'bg-green-100'}`}>
              <AlertCircle className={`w-5 h-5 ${stats.pendingApprovals > 0 ? 'text-amber-600' : 'text-green-600'}`} />
            </div>
          </div>

          {stats.loading ? (
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          ) : (
            <>
              <h3 className={`text-3xl font-bold ${stats.pendingApprovals > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {stats.pendingApprovals}
              </h3>
              <p className={`text-xs mt-3 font-semibold ${stats.pendingApprovals > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {stats.pendingApprovals > 0 ? 'Requer atenção' : '✓ Tudo em dia'}
              </p>
            </>
          )}
        </div>

        {/* Bloqueados */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all min-w-0 group">
          <div className="flex items-start justify-between mb-4">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">Bloqueados</p>
            <div className="w-10 h-10 rounded-lg bg-fluxabank-50 flex items-center justify-center group-hover:shadow-md transition-shadow">
              <Users className="w-5 h-5 text-fluxabank-400" />
            </div>
          </div>

          {stats.loading ? (
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          ) : (
            <>
              <h3 className="text-3xl font-bold text-fluxabank-500">{stats.blockedClients}</h3>
              <p className="text-xs text-fluxabank-500 mt-3 font-semibold">Acesso restrito</p>
            </>
          )}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">

        {/* Chart */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Faturamento Diário</h2>
              <p className="text-sm text-slate-500 mt-1">Receita de entradas (últimos 7 dias)</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-medium text-slate-600">7 dias</span>
            </div>
          </div>

          <div className="h-80 w-full min-w-0">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />

                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    dy={10}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />

                  <Tooltip 
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  />

                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#f97316"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                {stats.loading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-slate-300 mb-2" />
                ) : (
                  <>
                    <p className="font-medium">Sem dados de faturamento</p>
                    <p className="text-xs mt-2">Novas transações aparecerão aqui</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-700 shadow-lg text-white flex flex-col justify-between hover:shadow-xl transition-shadow group relative overflow-hidden min-w-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-12 -mt-12 blur-3xl group-hover:bg-white/10 transition-all duration-300"></div>
          
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-sm font-medium text-slate-400 mb-2">Status do Sistema</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <h3 className="text-2xl font-bold text-white">Operacional</h3>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
            </div>

            <div className="space-y-3 py-6 border-y border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">API Gateway</span>
                <span className="text-xs font-semibold text-green-400">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Serviços de Pagamento</span>
                <span className="text-xs font-semibold text-green-400">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Base de Dados</span>
                <span className="text-xs font-semibold text-green-400">Online</span>
              </div>
            </div>

            <p className="mt-6 text-sm text-slate-300 leading-relaxed">
              Todos os serviços estão respondendo normalmente. Nenhum incidente reportado.
            </p>

            <button
              onClick={() => onViewChange(AppView.SETTINGS)}
              className="mt-6 w-full py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all border border-white/20"
            >
              Configurações <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

