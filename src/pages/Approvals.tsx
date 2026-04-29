
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Check, X, FileText, Loader2, RefreshCw, AlertCircle, Image as ImageIcon, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../services/api';
import { BASE_URL, getHeaders, handleResponse } from '../services/config';
import { User, UserStatus, DocStatus } from '../types/index';

interface UserDocument {
  id: number;
  user_id: number;
  document_type: string;
  document_link: string;
  file_name: string;
  status: string;
  created_at: string;
  admin_notes?: string;
}

export const Approvals: React.FC = () => {
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [userDocuments, setUserDocuments] = useState<Record<number, UserDocument[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const [loadingDocs, setLoadingDocs] = useState<Record<number, boolean>>({});

  const fetchPending = async () => {
    setIsLoading(true);
    try {
      const users = await api.admin.users.list();
      const safeUsers = Array.isArray(users) ? users : [];
      
      const pending = safeUsers.filter(u => 
        !!u && (
          u.status === UserStatus.PENDING || 
          u.doc_status === DocStatus.PENDING || 
          u.doc_status === DocStatus.UNDER_REVIEW
        )
      );
      setPendingUsers(pending);
    } catch (error) {
      console.error('Failed to fetch pending approvals', error);
      setPendingUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserDocuments = async (userId: number) => {
    setLoadingDocs(prev => ({ ...prev, [userId]: true }));
    try {
      const response = await fetch(`${BASE_URL}/documents/admin/user/${userId}/documents`, {
        headers: getHeaders()
      });
      const data = await handleResponse(response);
      setUserDocuments(prev => ({
        ...prev,
        [userId]: data?.documents || []
      }));
    } catch (error) {
      console.error('Failed to fetch documents for user', error);
      setUserDocuments(prev => ({
        ...prev,
        [userId]: []
      }));
    } finally {
      setLoadingDocs(prev => ({ ...prev, [userId]: false }));
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (id: string | number) => {
    try {
      await api.admin.users.updateDocStatus(id, DocStatus.APPROVED, 'Aprovado via painel de aprovações');
      toast.success('Usuário aprovado com sucesso!');
      setPendingUsers(prev => prev.filter(u => String(u.id) !== String(id)));
    } catch (e) {
      toast.error('Erro ao aprovar usuário');
    }
  };

  const handleReject = async (id: string | number) => {
    if(confirm('Tem certeza que deseja rejeitar? O usuário precisará reenviar documentos.')) {
      try {
        await api.admin.users.updateDocStatus(id, DocStatus.REJECTED, 'Rejeitado via painel de aprovações');
        setPendingUsers(prev => prev.filter(u => String(u.id) !== String(id)));
      } catch (e) {
        toast.error('Erro ao rejeitar usuário');
      }
    }
  };

  const toggleUserExpand = async (userId: number) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
    } else {
      setExpandedUser(userId);
      if (!userDocuments[userId]) {
        await fetchUserDocuments(userId);
      }
    }
  };

  const openDocumentSafe = (link: string, fileName: string) => {
    if (!link) return;

    const openViaAnchor = (href: string, downloadName?: string) => {
      const a = document.createElement('a');
      a.href = href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      if (downloadName) a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    // Para data URLs/base64, converte para blob e abre via anchor para evitar bloqueio do navegador
    if (link.startsWith('data:')) {
      try {
        const [meta, data] = link.split(',', 2);
        const mimeMatch = meta.match(/data:(.*?);base64/);
        const mime = mimeMatch?.[1] || 'application/octet-stream';
        const binary = atob(data || '');
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: mime });
        const url = URL.createObjectURL(blob);
        openViaAnchor(url, fileName || 'document');
        setTimeout(() => URL.revokeObjectURL(url), 30000);
        return;
      } catch (err) {
        console.error('Falha ao abrir data URL', err);
      }
    }

    // Para links http(s) normais
    openViaAnchor(link);
  };

  const safePendingUsers = pendingUsers.filter(u => !!u);

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Fila de Aprovação (KYC)</h2>
            <p className="text-slate-500 text-sm">Analise e aprove a documentação de novos clientes.</p>
          </div>
          <button onClick={fetchPending} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors">
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
          </div>
        ) : safePendingUsers.length === 0 ? (
           <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
               <Check className="w-8 h-8 text-green-500" />
             </div>
             <h3 className="text-lg font-medium text-slate-800">Tudo limpo!</h3>
             <p className="text-slate-500">Nenhuma solicitação de KYC pendente no momento.</p>
           </div>
        ) : (
          safePendingUsers.map((user) => (
            <div key={user.id} className="bg-white rounded-xl border border-slate-200 shadow-sm animate-in slide-in-from-bottom-2 duration-300">
              <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                     <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800">{user.name || 'Sem Nome'}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> ID: {user.id}</span>
                      <span>•</span>
                      <span>{user.email}</span>
                    </div>
                    <div className="mt-2 flex gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                            Doc: {user.doc_status || 'PENDING'}
                        </span>
                        {Number((user as any).id) === Number((user as any).owner_user_id || (user as any).ownerUserId || (user as any).id) ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 uppercase">
                            Conta Principal
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-700 border border-cyan-200 uppercase">
                            Conta Vinculada • Titular #{Number((user as any).owner_user_id || (user as any).ownerUserId || user.id)}
                          </span>
                        )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto mt-4 md:mt-0">
                  <button 
                    onClick={() => toggleUserExpand(user.id)}
                    className="px-3 py-2 text-slate-600 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors"
                  >
                    {expandedUser === user.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    Documentos
                  </button>
                  <button onClick={() => handleReject(user.id)} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 flex items-center justify-center gap-2 transition-colors">
                    <X className="w-4 h-4" /> Rejeitar
                  </button>
                  <button onClick={() => handleApprove(user.id)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center justify-center gap-2 shadow-sm transition-colors">
                    <Check className="w-4 h-4" /> Aprovar
                  </button>
                </div>
              </div>

              {/* Documents Section GABRIEL É VIADINHO*/}
              {expandedUser === user.id && (
                <div className="border-t border-slate-200 bg-slate-50 p-6">
                  {loadingDocs[user.id] ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
                    </div>
                  ) : (userDocuments[user.id] || []).length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhum documento enviado ainda.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(userDocuments[user.id] || []).map((doc) => (
                        <div key={doc.id} className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-800 text-sm">{doc.document_type.toUpperCase()}</h4>
                              <p className="text-xs text-slate-500 mt-1">{doc.file_name}</p>
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded ${
                              doc.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                              doc.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {doc.status}
                            </span>
                          </div>

                          {/* Document Preview */}
                          <div className="mb-3">
                            {doc.document_link.startsWith('data:') || doc.document_link.includes('base64') ? (
                              <img 
                                src={doc.document_link} 
                                alt={doc.document_type}
                                className="w-full h-40 object-cover rounded-lg border border-slate-200"
                              />
                            ) : (
                              <img 
                                src={doc.document_link} 
                                alt={doc.document_type}
                                className="w-full h-40 object-cover rounded-lg border border-slate-200"
                              />
                            )}
                          </div>

                          {doc.admin_notes && (
                            <div className="bg-blue-50 rounded p-2 mb-3">
                              <p className="text-xs text-blue-700">{doc.admin_notes}</p>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button
                              onClick={() => openDocumentSafe(doc.document_link, doc.file_name)}
                              className="flex-1 text-center px-3 py-2 text-red-600 border border-red-300 rounded text-xs font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-1"
                            >
                              <Download className="w-3 h-3" /> Ver
                            </button>
                          </div>
                          
                          <p className="text-xs text-slate-400 mt-2">
                            {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

