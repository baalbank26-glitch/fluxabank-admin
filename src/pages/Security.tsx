
import React, { useEffect, useState } from 'react';
import {
    Shield,
    AlertTriangle,
    Search,
    Calendar,
    MapPin,
    User as UserIcon,
    Globe,
    Code,
    CheckCircle,
    XCircle,
    Info,
    Clock,
    Eye,
    RefreshCcw,
    ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import { toast } from 'react-toastify';

interface SecurityLog {
    id: number;
    type: string;
    ip_address: string;
    user_agent: string;
    method: string;
    path: string;
    payload: any;
    headers: any;
    reason: string;
    created_at: string;
}

export const Security: React.FC = () => {
    const [logs, setLogs] = useState<SecurityLog[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState<SecurityLog | null>(null);
    const [filters, setFilters] = useState({
        type: '',
        ip: '',
        dateFrom: '',
        dateTo: '',
        limit: 50,
        offset: 0
    });

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const response = await api.admin.security.getLogs(filters);
            if (response && response.ok) {
                setLogs(response.data || []);
                setTotal(response.total || 0);
            } else {
                toast.error('Erro ao carregar logs de segurança.');
            }
        } catch (error) {
            console.error('[Security] Error fetching logs:', error);
            toast.error('Erro de conexão ao buscar logs.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [filters.limit, filters.offset]);

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFilters({ ...filters, offset: 0 });
        fetchLogs();
    };

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'AUTH_FAILURE':
                return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-bold ring-1 ring-amber-200">AUTH_FAILURE</span>;
            case 'INVALID_CREDENTIALS':
                return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold ring-1 ring-red-200">INVALID_CREDENTIALS</span>;
            case 'IP_BLOCKED':
                return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold ring-1 ring-orange-200">IP_BLOCKED</span>;
            case 'MISSING_CREDENTIALS':
                return <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-bold ring-1 ring-slate-200">MISSING_CREDENTIALS</span>;
            case '2FA_FAILURE':
                return <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded text-xs font-bold ring-1 ring-rose-200">2FA_FAILURE</span>;
            case '2FA_MISSING':
                return <span className="px-2 py-1 bg-violet-100 text-violet-700 rounded text-xs font-bold ring-1 ring-violet-200">2FA_MISSING</span>;
            default:
                return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold ring-1 ring-blue-200">{type}</span>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Shield className="w-8 h-8 text-red-600" />
                        Central de Segurança / IDS
                    </h2>
                    <p className="text-slate-500 text-sm">
                        Monitoramento de tentativas de acesso, transações não autorizadas e bloqueios de IP.
                    </p>
                </div>
                <button
                    onClick={() => fetchLogs()}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    title="Atualizar logs"
                >
                    <RefreshCcw className={`w-5 h-5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Estatísticas Rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-red-50 rounded-lg">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase">Total de Alertas</p>
                        <p className="text-2xl font-bold text-slate-800">{total}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-amber-50 rounded-lg">
                        <UserIcon className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase">Falhas de Auth (24h)</p>
                        <p className="text-2xl font-bold text-slate-800">
                            {logs.filter(l => l.type.includes('AUTH') && new Date(l.created_at).getTime() > Date.now() - 86400000).length}
                        </p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-orange-50 rounded-lg">
                        <Globe className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase">IPs Bloqueados (24h)</p>
                        <p className="text-2xl font-bold text-slate-800">
                            {logs.filter(l => l.type === 'IP_BLOCKED' && new Date(l.created_at).getTime() > Date.now() - 86400000).length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <form onSubmit={handleFilterSubmit} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="relative">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Tipo de Evento</label>
                    <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        value={filters.type}
                        onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                    >
                        <option value="">Todos</option>
                        <option value="AUTH_FAILURE">Falha de Auth</option>
                        <option value="INVALID_CREDENTIALS">Credenciais Inválidas</option>
                        <option value="IP_BLOCKED">IP Bloqueado</option>
                        <option value="MISSING_CREDENTIALS">Sem Credenciais</option>
                        <option value="2FA_FAILURE">Falha no 2FA</option>
                        <option value="2FA_MISSING">Código 2FA Ausente</option>
                    </select>
                </div>
                <div className="relative">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Endereço IP</label>
                    <input
                        type="text"
                        placeholder="Ex: 127.0.0.1"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        value={filters.ip}
                        onChange={(e) => setFilters({ ...filters, ip: e.target.value })}
                    />
                </div>
                <div className="relative">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Data Início</label>
                    <input
                        type="date"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        value={filters.dateFrom}
                        onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                    />
                </div>
                <div className="relative">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Data Fim</label>
                    <input
                        type="date"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        value={filters.dateTo}
                        onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                    />
                </div>
                <div className="flex items-end">
                    <button type="submit" className="w-full bg-slate-800 text-white rounded-lg px-4 py-2 text-sm font-bold hover:bg-slate-700 flex items-center justify-center gap-2 transition-colors">
                        <Search className="w-4 h-4" />
                        Filtrar
                    </button>
                </div>
            </form>

            {/* Tabela de Logs */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Data/Hora</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Tipo</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">IP Origem</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Caminho</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Motivo</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-4 bg-slate-50/50"></td>
                                    </tr>
                                ))
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        Nenhum alerta de segurança registrado.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-slate-700">
                                                    {new Date(log.created_at).toLocaleDateString('pt-BR')}
                                                </span>
                                                <span className="text-xs text-slate-400">
                                                    {new Date(log.created_at).toLocaleTimeString('pt-BR')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getTypeBadge(log.type)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-slate-600 font-mono">
                                                <MapPin className="w-3 h-3 text-slate-400" />
                                                {log.ip_address}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-400">{log.method}</span>
                                                <span className="text-sm text-slate-600 font-mono truncate max-w-[200px]" title={log.path}>
                                                    {log.path}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-slate-600 line-clamp-2 max-w-[250px]" title={log.reason}>
                                                {log.reason || 'S/ motivo especificado'}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                title="Ver detalhes"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Detalhes */}
            {selectedLog && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-500/20 rounded-xl">
                                    <Shield className="w-6 h-6 text-red-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">Detalhes do Alerta #{selectedLog.id}</h3>
                                    <p className="text-slate-400 text-sm">{selectedLog.type}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <RefreshCcw className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                                        <Info className="w-4 h-4" /> Informações Básicas
                                    </h4>
                                    <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                            <span className="text-sm text-slate-500">Data/Hora</span>
                                            <span className="text-sm font-medium text-slate-800">{new Date(selectedLog.created_at).toLocaleString('pt-BR')}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                            <span className="text-sm text-slate-500">IP de Origem</span>
                                            <span className="text-sm font-bold text-red-600 font-mono">{selectedLog.ip_address}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                            <span className="text-sm text-slate-500">Método HTTP</span>
                                            <span className="text-sm font-bold text-slate-800 bg-slate-200 px-2 py-0.5 rounded uppercase">{selectedLog.method}</span>
                                        </div>
                                        <div className="flex flex-col py-2">
                                            <span className="text-sm text-slate-500 mb-1">Caminho do Recurso</span>
                                            <span className="text-sm font-mono text-slate-700 bg-white p-2 rounded border border-slate-200 break-all">{selectedLog.path}</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                                        <Code className="w-4 h-4" /> User Agent (Navegador/Dispositivo)
                                    </h4>
                                    <div className="bg-slate-50 rounded-2xl p-4">
                                        <p className="text-xs text-slate-600 font-mono leading-relaxed break-all">
                                            {selectedLog.user_agent || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-amber-500" /> Motivo do Bloqueio
                                    </h4>
                                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                                        <p className="text-sm text-red-800 font-medium">
                                            {selectedLog.reason || 'Nenhuma razão detalhada fornecida pelo sistema.'}
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                                        <Clock className="w-4 h-4" /> Payload / Headers da Requisição
                                    </h4>
                                    <div className="bg-slate-900 rounded-2xl p-4 h-[300px] overflow-y-auto custom-scrollbar">
                                        <pre className="text-[10px] text-green-400 font-mono whitespace-pre-wrap">
                                            {JSON.stringify({
                                                payload: selectedLog.payload,
                                                headers: selectedLog.headers
                                            }, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="px-6 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-100 transition-colors"
                            >
                                Fechar
                            </button>
                            <button
                                onClick={() => toast.info('Funcionalidade de bloqueio de IP permanente em desenvolvimento')}
                                className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors flex items-center gap-2"
                            >
                                <XCircle className="w-4 h-4" />
                                Bloquear IP Persistentemente
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
