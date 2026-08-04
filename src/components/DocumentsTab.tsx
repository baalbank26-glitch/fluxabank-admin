import React, { useState, useEffect } from 'react';
import { FileText, Loader2, Download, X, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { BASE_URL, getHeaders, handleResponse } from '../services/config';
import { toast } from 'react-toastify';

interface UserDocument {
  id: number;
  user_id: number;
  document_type: string;
  document_link: string;
  file_name: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  admin_notes?: string;
}

interface DocumentsTabProps {
  userId: number | string;
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({ userId }) => {
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<UserDocument | null>(null);
  const [reviewingDoc, setReviewingDoc] = useState<number | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/documents/admin/user/${userId}/documents`, {
        headers: getHeaders()
      });
      const data = await handleResponse(response);
      setDocuments(data?.documents || []);
    } catch (error) {
      console.error('Failed to fetch documents', error);
      toast.error('Erro ao carregar documentos');
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [userId]);

  const handleApproveDocument = async (docId: number) => {
    try {
      const response = await fetch(`${BASE_URL}/documents/admin/${docId}/approve`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ notes: reviewNotes || undefined })
      });
      await handleResponse(response);
      toast.success('Documento aprovado!');
      setReviewingDoc(null);
      setReviewNotes('');
      await fetchDocuments();
    } catch (error) {
      toast.error('Erro ao aprovar documento');
    }
  };

  const handleRejectDocument = async (docId: number) => {
    try {
      const response = await fetch(`${BASE_URL}/documents/admin/${docId}/reject`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ notes: reviewNotes || 'Documento rejeitado pelo admin' })
      });
      await handleResponse(response);
      toast.success('Documento rejeitado!');
      setReviewingDoc(null);
      setReviewNotes('');
      await fetchDocuments();
    } catch (error) {
      toast.error('Erro ao rejeitar documento');
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    if (!confirm('Tem certeza que deseja deletar este documento?')) return;

    try {
      const response = await fetch(`${BASE_URL}/documents/admin/${docId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      await handleResponse(response);
      toast.success('Documento deletado!');
      await fetchDocuments();
    } catch (error) {
      toast.error('Erro ao deletar documento');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-20 bg-[#090d0a] rounded-lg border border-emerald-500/20 border-dashed">
        <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-200">Nenhum documento enviado</h3>
        <p className="text-slate-400 text-sm mt-2">O usuário ainda não enviou documentos para verificação.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com refresh */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-slate-100">Documentos Enviados</h3>
        <button
          onClick={fetchDocuments}
          className="p-2 text-slate-300 hover:bg-emerald-950/40 rounded-lg border border-emerald-500/20 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Grid de documentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((doc) => (
          <div key={doc.id} className="border border-emerald-500/20 rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-[#0f1713]">
            {/* Status Badge */}
            <div className={`px-4 py-2 text-xs font-bold flex items-center justify-between ${
              doc.status === 'APPROVED' ? 'bg-emerald-950/30 text-emerald-300' :
              doc.status === 'REJECTED' ? 'bg-red-950/20 text-red-300 border border-red-500/20' :
              'bg-amber-500/10 text-amber-300 border border-amber-500/20'
            }`}>
              <span className="flex items-center gap-1">
                {doc.status === 'APPROVED' && <CheckCircle className="w-3 h-3" />}
                {doc.status === 'REJECTED' && <AlertCircle className="w-3 h-3" />}
                {doc.status === 'PENDING' && <AlertCircle className="w-3 h-3" />}
                {doc.status}
              </span>
              <span className="text-[10px]">{doc.document_type.toUpperCase()}</span>
            </div>

            {/* Document Preview */}
            <div className="bg-[#0f1713] border-b border-emerald-500/20 flex items-center justify-center p-4 min-h-[150px] cursor-pointer hover:bg-emerald-950/30 transition-colors" onClick={() => setSelectedDoc(doc)}>
              {doc.document_link.includes('image') || doc.document_link.includes('data:') ? (
                <img 
                  src={doc.document_link} 
                  alt={doc.document_type}
                  className="max-w-full max-h-[150px] object-contain rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    const parent = (e.target as HTMLImageElement).parentElement;
                    if (parent) {
                      parent.innerHTML = '<div className="flex flex-col items-center text-slate-400"><FileText className="w-8 h-8" /><span className="text-xs mt-2">Documento</span></div>';
                    }
                  }}
                />
              ) : (
                <div className="flex flex-col items-center text-slate-400">
                  <FileText className="w-8 h-8" />
                  <span className="text-xs mt-2">Arquivo</span>
                </div>
              )}
            </div>

            {/* Document Info */}
            <div className="p-4 space-y-2">
              <div>
                <p className="text-xs text-slate-400">Nome do arquivo</p>
                <p className="text-sm font-medium text-slate-100 truncate">{doc.file_name}</p>
              </div>

              <div>
                <p className="text-xs text-slate-400">Data de envio</p>
                <p className="text-sm text-slate-200">{new Date(doc.created_at).toLocaleDateString('pt-BR')}</p>
              </div>

              {doc.admin_notes && (
                <div className="bg-emerald-950/20 rounded p-2 border border-emerald-500/10">
                  <p className="text-xs text-emerald-400"><strong>Notas:</strong> {doc.admin_notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-emerald-500/20">
                <a
                  href={doc.document_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-3 py-2 text-emerald-500 border border-emerald-500/30 rounded text-xs font-medium hover:bg-emerald-950/20 transition-colors flex items-center justify-center gap-1"
                >
                  <Download className="w-3 h-3" /> Download
                </a>

                {doc.status === 'PENDING' && (
                  <button
                    onClick={() => setReviewingDoc(doc.id)}
                    className="flex-1 px-3 py-2 bg-amber-500 text-white rounded text-xs font-medium hover:bg-amber-600 transition-colors"
                  >
                    Revisar
                  </button>
                )}

                <button
                  onClick={() => handleDeleteDocument(doc.id)}
                  className="px-3 py-2 bg-emerald-950/20 text-emerald-500 rounded text-xs font-medium hover:bg-emerald-950/40 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Review Modal */}
            {reviewingDoc === doc.id && (
              <div className="border-t border-emerald-500/20 bg-[#090d0a] p-4 space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-200">Notas de revisão</label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Adicione observações sobre a aprovação ou rejeição..."
                    className="w-full mt-1 px-3 py-2 border border-emerald-500/30 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveDocument(doc.id)}
                    className="flex-1 px-3 py-2 bg-emerald-500 text-slate-950 rounded text-xs font-extrabold hover:bg-emerald-400 transition-colors flex items-center justify-center gap-1"
                  >
                    <CheckCircle className="w-3 h-3" /> Aprovar
                  </button>
                  <button
                    onClick={() => handleRejectDocument(doc.id)}
                    className="flex-1 px-3 py-2 bg-emerald-500 text-white rounded text-xs font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1"
                  >
                    <AlertCircle className="w-3 h-3" /> Rejeitar
                  </button>
                  <button
                    onClick={() => {
                      setReviewingDoc(null);
                      setReviewNotes('');
                    }}
                    className="px-3 py-2 bg-[#090d0a] text-slate-300 border border-emerald-500/20 rounded text-xs font-bold hover:bg-emerald-950/30 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Full Image Viewer Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f1713] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-emerald-500/20">
              <h3 className="font-semibold text-slate-100">{selectedDoc.file_name}</h3>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-2 hover:bg-emerald-950/40 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <img
                src={selectedDoc.document_link}
                alt={selectedDoc.document_type}
                className="w-full h-auto rounded-lg border border-emerald-500/20"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
