
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { User, UserStatus, DocStatus, Wallet, LedgerItem, Provider } from '../types/index';
import { api } from '../services/api';
import { SuccessModal } from '../components';
import { 
  Search, 
  X,
  User as UserIcon, 
  Wallet as WalletIcon, 
  Settings2,
  Loader2,
  RefreshCw,
  Save,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  Building2,
  Copy,
  Check,
  Bitcoin,
  Eye,
  File
} from 'lucide-react';

interface UserDocument {
  id?: string | number;
  userId?: string | number;
  user_id?: string | number;
  documentType?: string;
  document_type?: string;
  documentLink?: string;
  document_link?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  [key: string]: any;
}

const safeDateTime = (dateStr: string | undefined): string => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '-' : d.toLocaleString('pt-BR');
  } catch {
    return '-';
  }
};

export const Clients: React.FC = () => {
    const USERS_PER_PAGE = 50;
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'WALLET' | 'FEES' | 'PROVIDER' | 'CONFIG' | 'DOCUMENTS'>('PROFILE');
  
  const [userWallet, setUserWallet] = useState<Wallet | null>(null);
  const [userLedger, setUserLedger] = useState<LedgerItem[]>([]);
  const [feesForm, setFeesForm] = useState({ 
    pixInPercent: '', 
    pixOutPercent: '',
    pixInFeeType: 'PERCENT' as 'PERCENT' | 'FIXED',
    pixInFeeValue: '',
    pixOutFeeType: 'PERCENT' as 'PERCENT' | 'FIXED',
    pixOutFeeValue: '',
    commissionFeeType: 'PERCENT' as 'PERCENT' | 'FIXED',
    commissionFeeValue: 0,
    ggrFeeType: 'PERCENT' as 'PERCENT' | 'FIXED',
    ggrFeeValue: 0,
    otcFeePercentage: ''
  });
  const [docNotes, setDocNotes] = useState('');
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [apiCredentials, setApiCredentials] = useState<{appId: string, appSecret: string} | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [userProvider, setUserProvider] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [configForm, setConfigForm] = useState({
    webhook_url: '',
    webhook_url_pix_in: '',
    webhook_url_pix_out: '',
        refund_api_route: '',
    ip_whitelist: '',
        cnpj_whitelist: '',
        pix_in_enabled: true,
        pix_out_enabled: true,
  });
  const [userDocuments, setUserDocuments] = useState<UserDocument[]>([]);
    const [linkedAccountsData, setLinkedAccountsData] = useState<any | null>(null);
    const [successModal, setSuccessModal] = useState({ open: false, title: '', message: '' });

    const openSuccessModal = (title: string, message: string) => {
        setSuccessModal({ open: true, title, message });
    };

    const closeSuccessModal = () => {
        setSuccessModal(prev => ({ ...prev, open: false }));
    };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await api.admin.users.list();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const openDocumentSafe = (documentLink: string) => {
    if (!documentLink) {
      toast.error('Documento no disponvel');
      return;
    }

    // Se for data URL (base64), converter para blob e abrir
    if (documentLink.startsWith('data:')) {
      try {
        const arr = documentLink.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
        const bstr = atob(arr[1]);
        const n = bstr.length;
        const u8arr = new Uint8Array(n);
        for (let i = 0; i < n; i++) {
          u8arr[i] = bstr.charCodeAt(i);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.target = '_blank';
        a.click();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
      } catch (error) {
        console.error('Erro ao abrir documento:', error);
        toast.error('Erro ao abrir documento');
      }
    } else {
      // Se for URL normal, abrir diretamente
      window.open(documentLink, '_blank');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openUserModal = async (user: User) => {
    setSelectedUser(user);
    setActiveTab('PROFILE');
    setLoadingDetails(true);
    setApiCredentials(null);
    setDocNotes(user.doc_status_notes || '');
    setSelectedProvider('');
    setUserProvider(null);
    setUserDocuments([]);
    setLinkedAccountsData(null);
    setConfigForm({
      webhook_url: user.webhook_url || '',
      webhook_url_pix_in: user.webhook_url_pix_in || '',
      webhook_url_pix_out: user.webhook_url_pix_out || '',
            refund_api_route: user.refund_api_route || '',
      ip_whitelist: user.ip_whitelist || '',
            cnpj_whitelist: '',
            pix_in_enabled: user.pix_in_enabled ?? true,
            pix_out_enabled: user.pix_out_enabled ?? true,
    });
    
    // Carregar documentos do usurio
    try {
      const docs = await api.admin.documents.getUserDocuments(user.id);
      setUserDocuments(Array.isArray(docs) ? docs : []);
    } catch (e) {
      console.error('Erro ao carregar documentos:', e);
      setUserDocuments([]);
    }

        try {
            const linkedData = await api.admin.users.getLinkedAccounts(user.id);
            setLinkedAccountsData(linkedData || null);
        } catch (e) {
            console.error('Erro ao carregar contas vinculadas:', e);
            setLinkedAccountsData(null);
        }
    
    // Carregar lista de providers
    try {
      const providersList = await api.admin.providers.list();
      setProviders(Array.isArray(providersList) ? providersList : []);
    } catch (e) {
      console.error('Erro ao carregar providers:', e);
      setProviders([]);
    }
    
    // Carregar taxas do usurio
    try {
        const feesData = await api.admin.users.getFees(user.id);
        setFeesForm({ 
            pixInPercent: (feesData?.pixInPercent || 0).toString(), 
            pixOutPercent: (feesData?.pixOutPercent || 0).toString(),
            pixInFeeType: (feesData?.pixInFeeType || 'PERCENT') as 'PERCENT' | 'FIXED',
            pixInFeeValue: (feesData?.pixInFeeValue || 0).toString(),
            pixOutFeeType: (feesData?.pixOutFeeType || 'PERCENT') as 'PERCENT' | 'FIXED',
            pixOutFeeValue: (feesData?.pixOutFeeValue || 0).toString(),
            commissionFeeType: 'PERCENT' as 'PERCENT' | 'FIXED',
            commissionFeeValue: 0,
            ggrFeeType: 'PERCENT' as 'PERCENT' | 'FIXED',
            ggrFeeValue: 0,
            otcFeePercentage: (feesData?.otcFeePercentage || user.otcFeePercentage || 0).toString()
        });
    } catch (e) {
        console.error('Erro ao carregar taxas:', e);
        setFeesForm({ 
            pixInPercent: '', 
            pixOutPercent: '',
            pixInFeeType: 'PERCENT',
            pixInFeeValue: '',
            pixOutFeeType: 'PERCENT',
            pixOutFeeValue: '',
            commissionFeeType: 'PERCENT',
            commissionFeeValue: 0,
            ggrFeeType: 'PERCENT',
            ggrFeeValue: 0,
            otcFeePercentage: ''
        });
    }
    
    setUserWallet(null);
    setUserLedger([]);
    setLoadingDetails(false);
  };

  const loadWalletData = async () => {
    if (!selectedUser) return;
    setLoadingDetails(true);
    try {
        const [w, l] = await Promise.all([
            api.admin.wallet.get(selectedUser.id).catch(() => null),
            api.admin.wallet.getLedger(selectedUser.id).catch(() => [])
        ]);
        setUserWallet(w);
        setUserLedger(Array.isArray(l) ? l : []);
    } catch (e) {
        console.error(e);
        setUserWallet(null);
        setUserLedger([]);
    } finally {
        setLoadingDetails(false);
    }
  };

  useEffect(() => {
      if (activeTab === 'WALLET') loadWalletData();
  }, [activeTab]);

  const handleUpdateDocStatus = async (status: DocStatus, overrideNotes?: string) => {
      if (!selectedUser) return;
      setActionLoading(true);
      const notesToSend = overrideNotes !== undefined ? overrideNotes : docNotes;
      
      try {
          const res = await api.admin.users.updateDocStatus(selectedUser.id, status, notesToSend);
          if (res && (res as any).appId && (res as any).appSecret) {
              setApiCredentials({ appId: (res as any).appId, appSecret: (res as any).appSecret });
          }
          
          if (status === DocStatus.APPROVED) {
                openSuccessModal('Conta aprovada', 'A conta do usurio foi aprovada com sucesso.');
          } else if (status === DocStatus.REJECTED) {
                 openSuccessModal('Conta suspensa/rejeitada', 'A conta do usurio foi atualizada com sucesso.');
          } else {
                 openSuccessModal('Status atualizado', `O status do usurio foi atualizado para ${status}.`);
          }
          
          const updatedUser = { ...selectedUser, doc_status: status as DocStatus, doc_status_notes: notesToSend };
          setSelectedUser(updatedUser);
          setUsers(prev => prev.map(u => u.id === selectedUser.id ? updatedUser : u));

      } catch (e) {
          toast.error('Erro ao atualizar status');
      } finally {
          setActionLoading(false);
      }
  };

  const handleUpdateFees = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedUser) return;
      setActionLoading(true);
      try {
          // Converter strings para nmeros
          const pixInFeeValue = parseFloat((feesForm.pixInFeeValue || '0').toString().replace(',', '.')) || 0;
          const pixInPercent = parseFloat((feesForm.pixInPercent || '0').toString().replace(',', '.')) || 0;
          const pixOutFeeValue = parseFloat((feesForm.pixOutFeeValue || '0').toString().replace(',', '.')) || 0;
          const pixOutPercent = parseFloat((feesForm.pixOutPercent || '0').toString().replace(',', '.')) || 0;
          const otcFeePercentage = parseFloat((feesForm.otcFeePercentage || '0').toString().replace(',', '.')) || 0;
          
          // Determinar o tipo de taxa baseado no que foi configurado
          // Se houver taxa fixa, usar FIXED, caso contrrio PERCENT
          // Mas sempre enviar ambos os valores (fixa e percentual) para permitir combinao
          const pixInFeeType = pixInFeeValue > 0 ? 'FIXED' : (pixInPercent > 0 ? 'PERCENT' : 'PERCENT');
          const pixOutFeeType = pixOutFeeValue > 0 ? 'FIXED' : (pixOutPercent > 0 ? 'PERCENT' : 'PERCENT');
          
          await api.admin.users.updateFees(
              selectedUser.id, 
              pixInPercent, 
              pixOutPercent,
              pixInFeeType,
              pixInFeeValue,
              pixOutFeeType,
              pixOutFeeValue,
              otcFeePercentage > 0 ? otcFeePercentage : null
          );
          
          
          // Atualiza o usurio selecionado e a lista local com as novas taxas
          const updatedUser = { 
              ...selectedUser, 
              pixInPercent: pixInPercent, 
              pixOutPercent: pixOutPercent,
              pixInFeeType: feesForm.pixInFeeType,
              pixInFeeValue: pixInFeeValue,
              pixOutFeeType: feesForm.pixOutFeeType,
              pixOutFeeValue: pixOutFeeValue,
              otc_fee_percentage: otcFeePercentage > 0 ? otcFeePercentage / 100 : null
          };
          setSelectedUser(updatedUser);
          setUsers(prev => prev.map(u => u.id === selectedUser.id ? updatedUser : u));
          
          openSuccessModal('Taxas atualizadas', 'As taxas do usurio foram salvas com sucesso.');
      } catch (e) {
          toast.error('Erro ao salvar taxas');
      } finally {
          setActionLoading(false);
      }
  };

  const handleSaveProvider = async () => {
      if (!selectedUser || !selectedProvider) {
          toast.warning('Por favor, selecione um provider');
          return;
      }
      setActionLoading(true);
      try {
          const result = await api.admin.users.updateProvider(selectedUser.id, selectedProvider);
          if (result.ok == true) {
              setUserProvider(selectedProvider);
              // Atualiza o provider no objeto do usurio
              const updatedUser = { ...selectedUser, provider: selectedProvider };
              setSelectedUser(updatedUser);
              // Atualiza tambm na lista de usurios
              setUsers(prev => prev.map(u => u.id === selectedUser.id ? updatedUser : u));
              const providerName = providers.find(p => p.code === selectedProvider)?.name || selectedProvider;
              openSuccessModal('Provider atualizado', `O provider do usurio foi alterado para ${providerName}.`);
          } else {
              toast.error('Erro ao salvar provider');
          }
      } catch (e) {
          console.error(e);
          toast.error('Erro ao salvar provider');
      } finally {
          setActionLoading(false);
      }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedUser) return;
      setActionLoading(true);
      try {
          const result = await api.admin.users.updateConfig(
              selectedUser.id,
              configForm.webhook_url,
              configForm.webhook_url_pix_in,
              configForm.webhook_url_pix_out,
              configForm.refund_api_route,
              configForm.ip_whitelist,
              configForm.pix_in_enabled,
              configForm.pix_out_enabled
          );
          if (result && result.ok) {
              const updatedUser = {
                  ...selectedUser,
                  webhook_url: configForm.webhook_url,
                  webhook_url_pix_in: configForm.webhook_url_pix_in,
                  webhook_url_pix_out: configForm.webhook_url_pix_out,
                  refund_api_route: configForm.refund_api_route,
                  ip_whitelist: configForm.ip_whitelist,
                  pix_in_enabled: configForm.pix_in_enabled,
                  pix_out_enabled: configForm.pix_out_enabled,
              };
              setSelectedUser(updatedUser);
              setUsers(prev => prev.map(u => u.id === selectedUser.id ? updatedUser : u));
              openSuccessModal('Configurações atualizadas', 'As configuraes do usurio foram salvas com sucesso.');
          } else {
              toast.error('Erro ao salvar configuraes');
          }
      } catch (e) {
          console.error(e);
          toast.error('Erro ao salvar configuraes');
      } finally {
          setActionLoading(false);
      }
  };

  useEffect(() => {
      if (activeTab === 'PROVIDER' && selectedUser) {
          // O provider j vem nos dados do usurio
          const providerCode = selectedUser.provider || null;
          setUserProvider(providerCode);
          setSelectedProvider(providerCode || '');
      }
      if (activeTab === 'CONFIG' && selectedUser) {
          // Carregar configuraes do usurio
          setConfigForm({
              webhook_url: selectedUser.webhook_url || '',
              webhook_url_pix_in: selectedUser.webhook_url_pix_in || '',
              webhook_url_pix_out: selectedUser.webhook_url_pix_out || '',
              refund_api_route: selectedUser.refund_api_route || '',
              ip_whitelist: selectedUser.ip_whitelist || '',
              cnpj_whitelist: '',
              pix_in_enabled: selectedUser.pix_in_enabled ?? true,
              pix_out_enabled: selectedUser.pix_out_enabled ?? true,
          });
      }
  }, [activeTab, selectedUser]);

  const handleSuspendAccount = () => {
    const reason = prompt('Motivo da suspenso (ser salvo nas notas):', 'Infrao dos termos de uso');
    if (reason) {
        handleUpdateDocStatus(DocStatus.REJECTED, `CONTA SUSPENSA: ${reason}`);
    }
  };

  // Safe filter to prevent crash on null users
  const filteredUsers = (users || []).filter(u => 
      u && (
          (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
          (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

    const activeUsersCount = (users || []).filter((u) => String(u?.status || '').toUpperCase() === UserStatus.ACTIVE).length;
    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const pageStart = (safeCurrentPage - 1) * USERS_PER_PAGE;
    const paginatedUsers = filteredUsers.slice(pageStart, pageStart + USERS_PER_PAGE);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, users.length]);

    const resolveOwnerId = (u: User) => Number((u as any).owner_user_id || (u as any).ownerUserId || u.id);
    const isPrimaryAccount = (u: User) => Number(u.id) === resolveOwnerId(u);

  const getTypeStyle = (type: string) => {
      const t = type?.toUpperCase() || '';
      if (t === 'CREDIT' || t === 'PIX_IN') return 'bg-green-100 text-green-700';
      if (t === 'DEBIT' || t === 'PIX_OUT') return 'bg-orange-100 text-orange-700';
      return 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold text-slate-800">Gestá Usuários</h2>
                        <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                            Ativos: {activeUsersCount}
                        </span>
                    </div>
          <p className="text-slate-500 text-sm">Base de clientes cadastrados no sistema.</p>
        </div>
        <button onClick={fetchUsers} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200">
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Buscar por nome ou email..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-orange-600" /></div>
        ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">ID</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Usuário</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Tipo Conta</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status KYC</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status Conta</th>
                                        <th className="px-6 py-4 text-end text-xs font-bold text-slate-500 uppercase">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredUsers.length === 0 ? (
                                        <tr><td colSpan={6} className="p-6 text-center text-slate-500">Nenhum usuário encontrado.</td></tr>
                                    ) : paginatedUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => openUserModal(user)}>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">#{user.id}</td>
                  <td className="px-6 py-4">
                    <div>
                        <p className="font-medium text-slate-800">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </td>
                                    <td className="px-6 py-4">
                                        {isPrimaryAccount(user) ? (
                                            <div className="flex flex-col gap-1">
                                                <span className="px-2 py-1 rounded-full text-xs font-bold flex w-fit items-center gap-1 bg-indigo-100 text-indigo-700">
                                                    Principal
                                                </span>
                                                {!!Number((user as any).linked_accounts_count || 0) && (
                                                    <span className="text-[11px] text-slate-500">
                                                        {Number((user as any).linked_accounts_count)} vinculada(s)
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-1">
                                                <span className="px-2 py-1 rounded-full text-xs font-bold flex w-fit items-center gap-1 bg-cyan-100 text-cyan-700">
                                                    Vinculada
                                                </span>
                                                <span className="text-[11px] text-slate-500">
                                                    Titular #{resolveOwnerId(user)}
                                                </span>
                                            </div>
                                        )}
                                    </td>
                  <td className="px-6 py-4">
                     <span className={`px-2 py-1 rounded-full text-xs font-bold flex w-fit items-center gap-1 ${
                        user.doc_status === DocStatus.APPROVED ? 'bg-green-100 text-green-700' : 
                        user.doc_status === DocStatus.REJECTED ? 'bg-orange-100 text-orange-700' :
                        'bg-amber-100 text-amber-700'
                    }`}>
                        {user.doc_status === DocStatus.APPROVED && <CheckCircle className="w-3 h-3"/>}
                        {user.doc_status === DocStatus.REJECTED && <XCircle className="w-3 h-3"/>}
                        {(!user.doc_status || user.doc_status === DocStatus.PENDING) && <Clock className="w-3 h-3"/>}
                        {user.doc_status || 'PENDING'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold flex w-fit items-center gap-1 ${
                        user.status === UserStatus.ACTIVE ? 'bg-green-100 text-green-700' : 
                        user.status === UserStatus.BLOCKED ? 'bg-orange-100 text-orange-700' :
                        user.status === UserStatus.PENDING ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                    }`}>
                        {user.status === UserStatus.ACTIVE && <CheckCircle className="w-3 h-3"/>}
                        {user.status === UserStatus.BLOCKED && <XCircle className="w-3 h-3"/>}
                        {user.status === UserStatus.PENDING && <Clock className="w-3 h-3"/>}
                        {user.status || 'ACTIVE'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-end">
                    <button className="text-orange-600 font-medium text-sm hover:underline">Gerenciar</button>
                  </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {filteredUsers.length > 0 && (
                            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <p className="text-sm text-slate-600">
                                    Mostrando {pageStart + 1} a {Math.min(pageStart + USERS_PER_PAGE, filteredUsers.length)} de {filteredUsers.length} usuários
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={safeCurrentPage <= 1}
                                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Anterior
                                    </button>
                                    <span className="text-sm text-slate-600 min-w-20 text-center">
                                        {safeCurrentPage} / {totalPages}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={safeCurrentPage >= totalPages}
                                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Prxima
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
        )}
      </div>

      {selectedUser && (
          <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-cyan-500 text-white flex items-center justify-center font-bold text-xl">
                              {(selectedUser.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                              <h3 className="text-xl font-bold text-slate-800">{selectedUser.name}</h3>
                              <p className="text-sm text-slate-500">ID: {selectedUser.id}</p>
                          </div>
                      </div>
                      <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
                  </div>

                  <div className="border-b border-slate-200 bg-white">
                      <div className="grid grid-cols-2 md:flex md:flex-wrap gap-0">
                          <button onClick={() => setActiveTab('PROFILE')} className={`py-3 md:py-4 px-2 md:px-4 text-xs md:text-sm font-semibold flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 border-b-2 transition-all ${
                              activeTab === 'PROFILE' 
                                ? 'border-orange-600 text-orange-600 bg-orange-50/50' 
                                : 'border-transparent text-slate-600 hover:text-orange-600 hover:bg-slate-50'
                          }`}>
                              <UserIcon className="w-4 h-4 flex-shrink-0" /> <span>Perfil</span>
                          </button>
                          <button onClick={() => setActiveTab('WALLET')} className={`py-3 md:py-4 px-2 md:px-4 text-xs md:text-sm font-semibold flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 border-b-2 transition-all ${
                              activeTab === 'WALLET' 
                                ? 'border-orange-600 text-orange-600 bg-orange-50/50' 
                                : 'border-transparent text-slate-600 hover:text-orange-600 hover:bg-slate-50'
                          }`}>
                              <WalletIcon className="w-4 h-4 flex-shrink-0" /> <span>Carteira</span>
                          </button>
                          <button onClick={() => setActiveTab('FEES')} className={`py-3 md:py-4 px-2 md:px-4 text-xs md:text-sm font-semibold flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 border-b-2 transition-all ${
                              activeTab === 'FEES' 
                                ? 'border-orange-600 text-orange-600 bg-orange-50/50' 
                                : 'border-transparent text-slate-600 hover:text-orange-600 hover:bg-slate-50'
                          }`}>
                              <Settings2 className="w-4 h-4 flex-shrink-0" /> <span>Taxas</span>
                          </button>
                          <button onClick={() => setActiveTab('PROVIDER')} className={`py-3 md:py-4 px-2 md:px-4 text-xs md:text-sm font-semibold flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 border-b-2 transition-all ${
                              activeTab === 'PROVIDER' 
                                ? 'border-orange-600 text-orange-600 bg-orange-50/50' 
                                : 'border-transparent text-slate-600 hover:text-orange-600 hover:bg-slate-50'
                          }`}>
                              <Building2 className="w-4 h-4 flex-shrink-0" /> <span>Provider</span>
                          </button>
                          <button onClick={() => setActiveTab('CONFIG')} className={`py-3 md:py-4 px-2 md:px-4 text-xs md:text-sm font-semibold flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 border-b-2 transition-all ${
                              activeTab === 'CONFIG' 
                                ? 'border-orange-600 text-orange-600 bg-orange-50/50' 
                                : 'border-transparent text-slate-600 hover:text-orange-600 hover:bg-slate-50'
                          }`}>
                              <Settings2 className="w-4 h-4 flex-shrink-0" /> <span>Config</span>
                          </button>
                          <button onClick={() => setActiveTab('DOCUMENTS')} className={`py-3 md:py-4 px-2 md:px-4 text-xs md:text-sm font-semibold flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 border-b-2 transition-all ${
                              activeTab === 'DOCUMENTS' 
                                ? 'border-orange-600 text-orange-600 bg-orange-50/50' 
                                : 'border-transparent text-slate-600 hover:text-orange-600 hover:bg-slate-50'
                          }`}>
                              <FileText className="w-4 h-4 flex-shrink-0" /> <span>Docs</span>
                          </button>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                      {loadingDetails ? (
                          <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-orange-600" /></div>
                      ) : (
                          <>
                            {activeTab === 'PROFILE' && (
                                <div className="space-y-6 max-w-2xl mx-auto">
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <FileText className="w-5 h-5 text-slate-500" /> Status da Conta
                                        </h4>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status Atual</label>
                                                <span className={`px-3 py-1 rounded-lg text-sm font-bold ${
                                                    selectedUser.doc_status === DocStatus.APPROVED ? 'bg-green-100 text-green-700' : 
                                                    selectedUser.doc_status === DocStatus.REJECTED ? 'bg-orange-100 text-orange-700' :
                                                    'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {selectedUser.doc_status === 'APPROVED' ? 'APROVADO / ATIVO' : selectedUser.doc_status || 'PENDENTE'}
                                                </span>
                                            </div>
                                            
                                            {selectedUser.doc_status === DocStatus.APPROVED ? (
                                                <div className="pt-4 mt-2 border-t border-slate-100">
                                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center gap-3">
                                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                                        <p className="text-sm text-green-800">Este usurio j estáovado e operação. Para gestá documentos, utilize o painel de conformidade.</p>
                                                    </div>
                                                    
                                                    <div className="space-y-2">
                                                        <label className="block text-xs font-bold text-slate-500 uppercase">Ações de Risco</label>
                                                        <button 
                                                            disabled={actionLoading}
                                                            onClick={handleSuspendAccount}
                                                            className="w-full py-3 bg-white hover:bg-orange-50 text-orange-600 border border-orange-200 hover:border-red-300 rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                                                        >
                                                            {actionLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                                            Suspender Conta (Bloquear)
                                                        </button>
                                                        <p className="text-xs text-slate-400 text-center">Isso revogar o acesso e rejeitar a documentao atual.</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Notas de Anlise</label>
                                                        <textarea 
                                                            value={docNotes}
                                                            onChange={(e) => setDocNotes(e.target.value)}
                                                            className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                                                            placeholder="Motivo da aprovao ou rejeio..."
                                                            rows={3}
                                                        />
                                                    </div>
                                                    <div className="flex gap-3 pt-2">
                                                        <button 
                                                            disabled={actionLoading}
                                                            onClick={() => handleUpdateDocStatus(DocStatus.APPROVED)}
                                                            className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                                        >
                                                            Aprovar Conta
                                                        </button>
                                                        <button 
                                                            disabled={actionLoading}
                                                            onClick={() => handleUpdateDocStatus(DocStatus.REJECTED)}
                                                            className="flex-1 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                                        >
                                                            Rejeitar
                                                        </button>
                                                        <button 
                                                            disabled={actionLoading}
                                                            onClick={() => handleUpdateDocStatus(DocStatus.UNDER_REVIEW)}
                                                            className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                                        >
                                                            Em Reviso
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {apiCredentials && (
                                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 animate-in slide-in-from-top-4">
                                            <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2">
                                                <CheckCircle className="w-5 h-5" /> Credenciais Geradas
                                            </h4>
                                            <p className="text-sm text-green-700 mb-3">Copie agora. O App Secret no ser exibido novamente.</p>
                                            <div className="space-y-2">
                                                <div className="bg-white p-2 rounded border border-green-200">
                                                    <span className="text-xs text-slate-400 block">App ID</span>
                                                    <code className="text-sm font-mono text-slate-800">{apiCredentials.appId}</code>
                                                </div>
                                                <div className="bg-white p-2 rounded border border-green-200">
                                                    <span className="text-xs text-slate-400 block">App Secret</span>
                                                    <code className="text-sm font-mono text-slate-800 break-all">{apiCredentials.appSecret}</code>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Card de Credenciais API */}
                                    {(selectedUser.app_id || selectedUser.appId || selectedUser.client_secret || selectedUser.appSecret) && (
                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                                <Settings2 className="w-5 h-5 text-slate-500" /> Credenciais da API
                                            </h4>
                                            <div className="space-y-3">
                                                {(selectedUser.app_id || selectedUser.appId) && (
                                                    <div 
                                                        onClick={() => {
                                                            const value = selectedUser.app_id || selectedUser.appId || '';
                                                            navigator.clipboard.writeText(value).then(() => {
                                                                toast.success('App ID copiado!');
                                                            }).catch(() => {
                                                                toast.error('Erro ao copiar');
                                                            });
                                                        }}
                                                        className="bg-slate-50 border border-slate-200 rounded-lg p-4 cursor-pointer hover:bg-slate-100 transition-colors group"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex-1">
                                                                <label className="text-xs text-slate-500 font-bold uppercase block mb-1">App ID</label>
                                                                <code className="text-sm font-mono text-slate-800 break-all block">{selectedUser.app_id || selectedUser.appId || '-'}</code>
                                                            </div>
                                                            <Copy className="w-4 h-4 text-slate-400 group-hover:text-orange-600 transition-colors ml-3 flex-shrink-0" />
                                                        </div>
                                                    </div>
                                                )}
                                                {(selectedUser.client_secret || selectedUser.appSecret) && (
                                                    <div 
                                                        onClick={() => {
                                                            const value = selectedUser.client_secret || selectedUser.appSecret || '';
                                                            navigator.clipboard.writeText(value).then(() => {
                                                                toast.success('Client Secret copiado!');
                                                            }).catch(() => {
                                                                toast.error('Erro ao copiar');
                                                            });
                                                        }}
                                                        className="bg-slate-50 border border-slate-200 rounded-lg p-4 cursor-pointer hover:bg-slate-100 transition-colors group"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex-1">
                                                                <label className="text-xs text-slate-500 font-bold uppercase block mb-1">Client Secret</label>
                                                                <code className="text-sm font-mono text-slate-800 break-all block">{selectedUser.client_secret || selectedUser.appSecret || '-'}</code>
                                                            </div>
                                                            <Copy className="w-4 h-4 text-slate-400 group-hover:text-orange-600 transition-colors ml-3 flex-shrink-0" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <h4 className="font-bold text-slate-800 mb-4">Dados Cadastrais</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-slate-500 font-bold uppercase">Nome</label>
                                                <p className="text-slate-800">{selectedUser.name}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500 font-bold uppercase">Email</label>
                                                <p className="text-slate-800">{selectedUser.email}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500 font-bold uppercase">Documento</label>
                                                <p className="text-slate-800">{selectedUser.document || '-'}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500 font-bold uppercase">Empresa</label>
                                                <p className="text-slate-800">{selectedUser.company || '-'}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500 font-bold uppercase">Tipo da Conta</label>
                                                <p className="text-slate-800">
                                                    {Number(selectedUser.id) === Number((selectedUser as any).owner_user_id || (selectedUser as any).ownerUserId || selectedUser.id)
                                                        ? 'Principal'
                                                        : 'Vinculada'}
                                                </p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500 font-bold uppercase">Titular (Owner ID)</label>
                                                <p className="text-slate-800">#{Number((selectedUser as any).owner_user_id || (selectedUser as any).ownerUserId || selectedUser.id)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <h4 className="font-bold text-slate-800 mb-4">Contas vinculadas ao titular</h4>

                                        {!linkedAccountsData ? (
                                            <p className="text-sm text-slate-500">Carregando vnculos...</p>
                                        ) : (
                                            <div className="space-y-3">
                                                <div className="text-sm text-slate-600">
                                                    Titular: <span className="font-semibold text-slate-800">{linkedAccountsData?.ownerUser?.name || '-'}</span>
                                                    {' '}#{linkedAccountsData?.ownerUserId}
                                                </div>

                                                <div className="space-y-2">
                                                    {(linkedAccountsData?.accounts || []).map((account: any) => (
                                                        <div key={account.id} className="p-3 border border-slate-200 rounded-lg flex items-center justify-between gap-3">
                                                            <div>
                                                                <p className="font-medium text-slate-800">{account.name}</p>
                                                                <p className="text-xs text-slate-500">ID #{account.id}  {account.email || 'sem email'}  {account.doc_status || 'PENDING'}</p>
                                                            </div>
                                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${account.is_owner ? 'bg-indigo-100 text-indigo-700' : 'bg-cyan-100 text-cyan-700'}`}>
                                                                {account.is_owner ? 'Principal' : 'Vinculada'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'WALLET' && (
                                <div className="space-y-8">
                                    <div className="bg-slate-900 rounded-2xl p-6 text-white flex justify-between items-center shadow-lg">
                                        <div>
                                            <p className="text-slate-400 text-sm font-medium mb-1">Saldo em Carteira</p>
                                            <h3 className="text-4xl font-bold">R$ {(Number(userWallet?.balance) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-bold text-slate-800 mb-4">Extrato da Carteira (Ledger)</h4>
                                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-slate-50 border-b border-slate-200">
                                                    <tr>
                                                        <th className="px-4 py-3 font-medium text-slate-500">Data</th>
                                                        <th className="px-4 py-3 font-medium text-slate-500">Descrio</th>
                                                        <th className="px-4 py-3 font-medium text-slate-500">Tipo</th>
                                                        <th className="px-4 py-3 font-medium text-slate-500 text-right">Valor</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {(userLedger || []).map((item, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50">
                                                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                                                                {safeDateTime(item.created_at)}
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-800">{item.description}</td>
                                                            <td className="px-4 py-3">
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getTypeStyle(item.type)}`}>
                                                                    {item.type}
                                                                </span>
                                                            </td>
                                                            <td className={`px-4 py-3 text-right font-mono font-medium ${
                                                                (item.type === 'CREDIT' || item.type === 'PIX_IN') ? 'text-green-600' : 'text-slate-800'
                                                            }`}>
                                                                {(item.type === 'DEBIT' || item.type === 'PIX_OUT') ? '-' : '+'}
                                                                R$ {(Number(item.amount) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {(userLedger || []).length === 0 && (
                                                        <tr><td colSpan={4} className="p-4 text-center text-slate-400">Nenhuma movimentao</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'FEES' && (
                                <form onSubmit={handleUpdateFees} className="max-w-2xl mx-auto space-y-8 py-4">
                                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                                        <Settings2 className="w-5 h-5 text-blue-600 mt-0.5" />
                                        <div>
                                            <h4 className="font-bold text-blue-900">Configurao de Tarifas</h4>
                                            <p className="text-sm text-blue-700">Defina as taxas retidas pelo gateway. Voc pode configurar taxa fixa, percentual ou ambas simultaneamente. Se ambas estám configuradas, sero somadas.</p>
                                        </div>
                                    </div>

                                    {/* PIX ENTRADA */}
                                    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                                        <h5 className="font-bold text-slate-800 flex items-center gap-2">
                                            <ArrowDownLeft className="w-5 h-5 text-green-500" />
                                            Pix Entrada (Cash-in)
                                        </h5>
                                        
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                                    Taxa Fixa (R$)
                                                </label>
                                                <div className="relative">
                                                    <input 
                                                        type="number" 
                                                        step="0.00001"
                                                        value={feesForm.pixInFeeValue}
                                                        onChange={(e) => setFeesForm({...feesForm, pixInFeeValue: e.target.value})}
                                                        className="w-full border border-slate-300 rounded-lg pl-3 pr-8 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none font-mono" 
                                                        placeholder="0.00"
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                                                </div>
                                                <p className="mt-1 text-xs text-slate-500">Valor fixo cobrado por transao (opcional)</p>
                                            </div>
                                            
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                                    Taxa Percentual (%)
                                                </label>
                                                <div className="relative">
                                                    <input 
                                                        type="number" 
                                                        step="0.00001"
                                                        value={feesForm.pixInPercent}
                                                        onChange={(e) => setFeesForm({...feesForm, pixInPercent: e.target.value})}
                                                        className="w-full border border-slate-300 rounded-lg pl-3 pr-8 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none font-mono" 
                                                        placeholder="0.00"
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                                                </div>
                                                <p className="mt-1 text-xs text-slate-500">Percentual sobre o valor da transao (opcional). Se ambas estám configuradas, sero somadas.</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* PIX SADA */}
                                    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                                        <h5 className="font-bold text-slate-800 flex items-center gap-2">
                                            <ArrowUpRight className="w-5 h-5 text-orange-500" />
                                            Pix Sada (Cash-out)
                                        </h5>
                                        
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                                    Taxa Fixa (R$)
                                                </label>
                                                <div className="relative">
                                                    <input 
                                                        type="number" 
                                                        step="0.00001"
                                                        value={feesForm.pixOutFeeValue}
                                                        onChange={(e) => setFeesForm({...feesForm, pixOutFeeValue: e.target.value})}
                                                        className="w-full border border-slate-300 rounded-lg pl-3 pr-8 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none font-mono" 
                                                        placeholder="0.00"
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                                                </div>
                                                <p className="mt-1 text-xs text-slate-500">Valor fixo cobrado por transao (opcional)</p>
                                            </div>
                                            
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                                    Taxa Percentual (%)
                                                </label>
                                                <div className="relative">
                                                    <input 
                                                        type="number" 
                                                        step="0.00001"
                                                        value={feesForm.pixOutPercent}
                                                        onChange={(e) => setFeesForm({...feesForm, pixOutPercent: e.target.value})}
                                                        className="w-full border border-slate-300 rounded-lg pl-3 pr-8 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none font-mono" 
                                                        placeholder="0.00"
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                                                </div>
                                                <p className="mt-1 text-xs text-slate-500">Percentual sobre o valor da transao (opcional). Se ambas estám configuradas, sero somadas.</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* OTC CRIPTO */}
                                    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                                        <h5 className="font-bold text-slate-800 flex items-center gap-2">
                                            <Bitcoin className="w-5 h-5 text-orange-500" />
                                            Taxa OTC (Criptomoedas)
                                        </h5>
                                        
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                                Taxa Percentual (%)
                                            </label>
                                            <div className="relative">
                                                <input 
                                                    type="number" 
                                                    step="0.00001"
                                                    value={feesForm.otcFeePercentage}
                                                    onChange={(e) => setFeesForm({...feesForm, otcFeePercentage: e.target.value})}
                                                    className="w-full border border-slate-300 rounded-lg pl-3 pr-8 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none font-mono" 
                                                    placeholder="0.00"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                                            </div>
                                            <p className="mt-1 text-xs text-slate-500">Taxa de converso BRL ? Criptomoedas (BTC, ETH, USDT). Exemplo: 5 = 5% de taxa</p>
                                        </div>
                                    </div>

                                    <button disabled={actionLoading} type="submit" className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors flex justify-center items-center gap-2 shadow-lg">
                                        {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4"/> Salvar Tarifas</>}
                                    </button>
                                </form>
                            )}

                            {activeTab === 'PROVIDER' && (
                                <div className="max-w-2xl mx-auto space-y-6 py-4">
                                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                                        <Building2 className="w-5 h-5 text-blue-600 mt-0.5" />
                                        <div>
                                            <h4 className="font-bold text-blue-900">Seleo de Provider</h4>
                                            <p className="text-sm text-blue-700">Escolha um provider de pagamento para estário. O provider ser usado para processar as transações.</p>
                                        </div>
                                    </div>

                                    {userProvider && (
                                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <CheckCircle className="w-5 h-5 text-green-600" />
                                                <h5 className="font-bold text-green-900">Provider Atual</h5>
                                            </div>
                                            <p className="text-sm text-green-700">
                                                {providers.find(p => p.code === userProvider)?.name || 'Provider selecionado'}
                                            </p>
                                        </div>
                                    )}

                                    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                                        <h5 className="font-bold text-slate-800 mb-4">Lista de Providers Disponveis</h5>
                                        
                                        {loadingDetails ? (
                                            <div className="flex justify-center py-8">
                                                <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
                                            </div>
                                        ) : providers.length === 0 ? (
                                            <div className="text-center py-8 text-slate-500">
                                                Nenhum provider disponvel.
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {providers.map((provider) => (
                                                    <label
                                                        key={provider.id}
                                                        className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                                            selectedProvider === provider.code
                                                                ? 'border-orange-600 bg-orange-50'
                                                                : 'border-slate-200 hover:border-slate-300'
                                                        } ${!provider.active ? 'opacity-60' : ''}`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="provider"
                                                            value={provider.code}
                                                            checked={selectedProvider === provider.code}
                                                            onChange={(e) => setSelectedProvider(e.target.value)}
                                                            disabled={!provider.active}
                                                            className="mt-1 w-4 h-4 text-orange-600 focus:ring-orange-500"
                                                        />
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <div className="font-bold text-slate-800">{provider.name}</div>
                                                                {!provider.active && (
                                                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">Inativo</span>
                                                                )}
                                                            </div>
                                                            <div className="text-sm text-slate-600 font-mono">{provider.code}</div>
                                                            <div className="text-xs text-slate-500 mt-1">{provider.base_url}</div>
                                                        </div>
                                                        {selectedProvider === provider.code && (
                                                            <CheckCircle className="w-5 h-5 text-orange-600" />
                                                        )}
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        disabled={actionLoading || !selectedProvider}
                                        onClick={handleSaveProvider}
                                        className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors flex justify-center items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {actionLoading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4" /> Salvar Provider
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            {activeTab === 'DOCUMENTS' && (
                                <div className="max-w-4xl mx-auto py-4">
                                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3 mb-6">
                                        <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                                        <div>
                                            <h4 className="font-bold text-blue-900">Documentos KYC</h4>
                                            <p className="text-sm text-blue-700">Documentao enviada pelo usurio para validao de identidade e conformidade.</p>
                                        </div>
                                    </div>

                                    {userDocuments.length === 0 ? (
                                        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                                            <File className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                            <p className="text-slate-500">Nenhum documento enviado por estário.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {userDocuments.map((doc, idx) => {
                                                // Normalizar nomes de propriedades (snake_case ou camelCase)
                                                const documentLink = doc.documentLink || doc.document_link || '';
                                                const documentType = doc.documentType || doc.document_type || 'Documento';
                                                const createdAt = doc.created_at || doc.createdAt;
                                                
                                                const isImage = documentLink.startsWith('data:image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(documentLink);
                                                const isPdf = documentLink.startsWith('data:application/pdf') || /\.pdf$/i.test(documentLink);
                                                
                                                return (
                                                    <div key={idx} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                                        <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 border-b border-slate-200">
                                                            <div className="flex items-start justify-between mb-2">
                                                                <h5 className="font-bold text-slate-800 text-sm">{documentType}</h5>
                                                                <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                                                                    isImage ? 'bg-blue-100 text-blue-700' :
                                                                    isPdf ? 'bg-orange-100 text-orange-700' :
                                                                    'bg-slate-100 text-slate-700'
                                                                }`}>
                                                                    {isImage ? 'Imagem' : isPdf ? 'PDF' : 'Arquivo'}
                                                                </span>
                                                            </div>
                                                            {createdAt && (
                                                                <p className="text-xs text-slate-500">
                                                                    Enviado em {safeDateTime(createdAt)}
                                                                </p>
                                                            )}
                                                        </div>
                                                        
                                                        <div className="p-4 space-y-3">
                                                            {isImage && documentLink.startsWith('data:image') ? (
                                                                <div className="bg-slate-50 rounded-lg overflow-hidden border border-slate-200">
                                                                    <img 
                                                                        src={documentLink} 
                                                                        alt={documentType}
                                                                        className="w-full h-40 object-cover"
                                                                    />
                                                                </div>
                                                            ) : null}
                                                            
                                                            <button
                                                                onClick={() => openDocumentSafe(documentLink)}
                                                                className="w-full py-2 px-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                                Visualizar
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'CONFIG' && (
                                <form onSubmit={handleSaveConfig} className="max-w-2xl mx-auto space-y-6 py-4">
                                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                                        <Settings2 className="w-5 h-5 text-blue-600 mt-0.5" />
                                        <div>
                                            <h4 className="font-bold text-blue-900">Configurações do Sistema</h4>
                                            <p className="text-sm text-blue-700">Configure a URL de webhook e os IPs permitidos para estário.</p>
                                        </div>
                                    </div>

                                    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                                        <h5 className="font-bold text-slate-800 mb-4">Webhook URLs</h5>
                                        
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                                URL de Webhook Geral (Opcional)
                                            </label>
                                            <input
                                                type="url"
                                                value={configForm.webhook_url}
                                                onChange={(e) => setConfigForm({...configForm, webhook_url: e.target.value})}
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                                                placeholder="https://exemplo.com/webhook"
                                            />
                                            <p className="mt-2 text-xs text-slate-500">
                                                URL genrica para todos os eventos. Ser usada como fallback se as URLs especficas no estám configuradas.
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                                URL de Webhook PIX IN (Depsitos)
                                            </label>
                                            <input
                                                type="url"
                                                value={configForm.webhook_url_pix_in}
                                                onChange={(e) => setConfigForm({...configForm, webhook_url_pix_in: e.target.value})}
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                                                placeholder="https://exemplo.com/webhook/pix-in"
                                            />
                                            <p className="mt-2 text-xs text-slate-500">
                                                URL especfica para receber notificaes de depsitos PIX. Se no configurada, ser usada a URL geral.
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                                URL de Webhook PIX OUT (Saques)
                                            </label>
                                            <input
                                                type="url"
                                                value={configForm.webhook_url_pix_out}
                                                onChange={(e) => setConfigForm({...configForm, webhook_url_pix_out: e.target.value})}
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                                                placeholder="https://exemplo.com/webhook/pix-out"
                                            />
                                            <p className="mt-2 text-xs text-slate-500">
                                                URL especfica para receber notificaes de saques PIX. Se no configurada, ser usada a URL geral.
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                                Webhook de Refund
                                            </label>
                                            <input
                                                type="url"
                                                value={configForm.refund_api_route}
                                                onChange={(e) => setConfigForm({...configForm, refund_api_route: e.target.value})}
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                                                placeholder="https://exemplo.com/webhook/refound"
                                            />
                                            <p className="mt-2 text-xs text-slate-500">
                                                URL de callback de refund do cliente. Se preenchida, ser usada automaticamente no processamento de refund.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                                        <h5 className="font-bold text-slate-800 mb-4">IP Whitelist</h5>
                                        
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                                IPs Permitidos
                                            </label>
                                            <textarea
                                                value={configForm.ip_whitelist}
                                                onChange={(e) => setConfigForm({...configForm, ip_whitelist: e.target.value})}
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                                                placeholder="192.168.1.1
10.0.0.1
200.123.45.67"
                                                rows={5}
                                            />
                                            <p className="mt-2 text-xs text-slate-500">
                                                Digite um IP por linha. Apenas requisies vindas destás sero aceitas.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                                        <h5 className="font-bold text-slate-800 mb-4">CNPJ Whitelist</h5>
                                        
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                                CNPJs Permitidos
                                            </label>
                                            <textarea
                                                value={configForm.cnpj_whitelist}
                                                onChange={(e) => setConfigForm({...configForm, cnpj_whitelist: e.target.value})}
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                                                placeholder="12.345.678/0001-90
98.765.432/0001-10
11.222.333/0001-44"
                                                rows={5}
                                            />
                                            <p className="mt-2 text-xs text-slate-500">
                                                Digite um CNPJ por linha. Apenas transações com estáPJs sero aceitas.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                                        <h5 className="font-bold text-slate-800 mb-4">Controle de Fluxo PIX</h5>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
                                                <div>
                                                    <p className="font-medium text-slate-800">PIX IN (Depsitos)</p>
                                                    <p className="text-xs text-slate-500 mt-1">Desative para bloquear novas entradas PIX destário.</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setConfigForm((prev) => ({ ...prev, pix_in_enabled: !prev.pix_in_enabled }))}
                                                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${configForm.pix_in_enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                                >
                                                    <span
                                                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition ${configForm.pix_in_enabled ? 'translate-x-5' : 'translate-x-0'}`}
                                                    />
                                                </button>
                                            </div>

                                            <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
                                                <div>
                                                    <p className="font-medium text-slate-800">PIX OUT (Saques)</p>
                                                    <p className="text-xs text-slate-500 mt-1">Desative para bloquear novos saques PIX destário.</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setConfigForm((prev) => ({ ...prev, pix_out_enabled: !prev.pix_out_enabled }))}
                                                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${configForm.pix_out_enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                                >
                                                    <span
                                                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition ${configForm.pix_out_enabled ? 'translate-x-5' : 'translate-x-0'}`}
                                                    />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        disabled={actionLoading}
                                        type="submit"
                                        className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors flex justify-center items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {actionLoading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4" /> Salvar Configurações
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}

      <SuccessModal
          open={successModal.open}
          title={successModal.title}
          message={successModal.message}
          onClose={closeSuccessModal}
      />
    </div>
  );
};


