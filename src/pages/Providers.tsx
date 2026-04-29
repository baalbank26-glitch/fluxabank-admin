
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Provider } from '../types/index';
import { api } from '../services/api';
import { 
  Search, 
  X,
  Loader2,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Power,
  PowerOff,
  Building2,
  Save,
  Globe
} from 'lucide-react';

const safeDateTime = (dateStr: string | undefined): string => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '-' : d.toLocaleString('pt-BR');
  } catch {
    return '-';
  }
};

export const Providers: React.FC = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    base_url: '',
    active: true
  });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchProviders = async () => {
    setIsLoading(true);
    try {
      const data = await api.admin.providers.list();
      setProviders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar providers');
      setProviders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      base_url: '',
      active: true
    });
    setEditingProvider(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (provider: Provider) => {
    setEditingProvider(provider);
    setFormData({
      code: provider.code,
      name: provider.name,
      base_url: provider.base_url,
      active: provider.active
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      if (editingProvider) {
        // Update existing provider
        const updated = await api.admin.providers.update(editingProvider.id, {
          code: formData.code,
          name: formData.name,
          base_url: formData.base_url
        });
        
        if (updated) {
          toast.success('Provider atualizado com sucesso!');
          closeModal();
          fetchProviders();
        } else {
          toast.error('Erro ao atualizar provider');
        }
      } else {
        // Create new provider
        const created = await api.admin.providers.create({
          code: formData.code,
          name: formData.name,
          base_url: formData.base_url,
          active: formData.active
        });
        
        if (created) {
          toast.success('Provider criado com sucesso!');
          closeModal();
          fetchProviders();
        } else {
          toast.error('Erro ao criar provider');
        }
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar provider');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (provider: Provider) => {
    if (!confirm(`Tem certeza que deseja excluir o provider "${provider.name}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setActionLoading(true);
    try {
      const success = await api.admin.providers.delete(provider.id);
      if (success) {
        toast.success('Provider excluído com sucesso!');
        fetchProviders();
      } else {
        toast.error('Erro ao excluir provider');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao excluir provider');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (provider: Provider) => {
    setActionLoading(true);
    try {
      const updated = await api.admin.providers.updateStatus(provider.id, !provider.active);
      if (updated) {
        toast.success(`Provider ${updated.active ? 'ativado' : 'desativado'} com sucesso!`);
        fetchProviders();
      } else {
        toast.error('Erro ao alterar status do provider');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao alterar status do provider');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredProviders = (providers || []).filter(p => 
    p && (
      (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (p.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.base_url || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestão de Providers</h2>
          <p className="text-slate-500 text-sm">Gerencie os providers de pagamento do sistema.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchProviders} 
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
            disabled={isLoading}
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={openCreateModal}
            className="px-4 py-2 bg-fluxabank-500 hover:bg-fluxabank-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Novo Provider
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Buscar por nome, código ou URL..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fluxabank-500/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-fluxabank-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Código</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Nome</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Base URL</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Criado em</th>
                  <th className="px-6 py-4 text-end text-xs font-bold text-slate-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProviders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500">
                      {searchTerm ? 'Nenhum provider encontrado.' : 'Nenhum provider cadastrado.'}
                    </td>
                  </tr>
                ) : filteredProviders.map((provider) => (
                  <tr key={provider.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">#{provider.id}</td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-medium text-slate-800 bg-slate-100 px-2 py-1 rounded">
                        {provider.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-slate-800">{provider.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Globe className="w-4 h-4 text-slate-400" />
                        <span className="font-mono text-xs">{provider.base_url}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        provider.active 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {provider.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {safeDateTime(provider.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end items-center gap-2">
                        <button
                          onClick={() => handleToggleStatus(provider)}
                          disabled={actionLoading}
                          className={`p-2 rounded-lg transition-colors ${
                            provider.active
                              ? 'text-amber-600 hover:bg-amber-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={provider.active ? 'Desativar' : 'Ativar'}
                        >
                          {provider.active ? (
                            <PowerOff className="w-4 h-4" />
                          ) : (
                            <Power className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => openEditModal(provider)}
                          disabled={actionLoading}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(provider)}
                          disabled={actionLoading}
                          className="p-2 text-fluxabank-500 hover:bg-fluxabank-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Create/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-fluxabank-500 to-orange-500 text-white flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">
                    {editingProvider ? 'Editar Provider' : 'Novo Provider'}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {editingProvider ? 'Atualize as informações do provider' : 'Preencha os dados do novo provider'}
                  </p>
                </div>
              </div>
              <button 
                onClick={closeModal} 
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                disabled={actionLoading}
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
              <div className="space-y-6 max-w-xl mx-auto">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                      Código *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                      className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-fluxabank-500 outline-none font-mono"
                      placeholder="PROVIDER_CODE"
                      disabled={!!editingProvider}
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      {editingProvider ? 'O código não pode ser alterado' : 'Código único do provider (será convertido para maiúsculas)'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                      Nome *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-fluxabank-500 outline-none"
                      placeholder="Nome do Provider"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                      Base URL *
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input
                        type="url"
                        required
                        value={formData.base_url}
                        onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-fluxabank-500 outline-none font-mono text-sm"
                        placeholder="https://api.provider.com"
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      URL base da API do provider
                    </p>
                  </div>

                  {!editingProvider && (
                    <div className="flex items-center gap-3 pt-2">
                      <input
                        type="checkbox"
                        id="active"
                        checked={formData.active}
                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                        className="w-4 h-4 text-fluxabank-500 border-slate-300 rounded focus:ring-fluxabank-500"
                      />
                      <label htmlFor="active" className="text-sm font-medium text-slate-700">
                        Provider ativo (pode ser usado para processar transações)
                      </label>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={actionLoading}
                    className="flex-1 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl font-medium transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {editingProvider ? 'Atualizar' : 'Criar Provider'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


