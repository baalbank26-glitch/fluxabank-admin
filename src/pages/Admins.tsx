import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { ShieldCheck, UserPlus, Loader2, PencilLine, X } from 'lucide-react';
import { api } from '../services/api';
import { ADMIN_PERMISSION_LIST, isMasterAdmin } from '../constants/adminPermissions';
import type { AdminUserRow } from '../services/admins.service';

const buildInitialPermissions = () =>
  ADMIN_PERMISSION_LIST.reduce((acc, item) => {
    acc[item.key] = false;
    return acc;
  }, {} as Record<string, boolean>);

export const Admins: React.FC = () => {
  const profile = useMemo(() => api.auth.getProfile(), []);
  const canManageAdmins = isMasterAdmin(profile);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [admins, setAdmins] = useState<AdminUserRow[]>([]);
  const [permissionCatalog, setPermissionCatalog] = useState(ADMIN_PERMISSION_LIST);
  const [editingAdmin, setEditingAdmin] = useState<AdminUserRow | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<Record<string, boolean>>(buildInitialPermissions());

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    permissions: buildInitialPermissions(),
  });

  const loadAdmins = async () => {
    if (!canManageAdmins) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const payload = await api.admin.admins.list();
      setAdmins(payload.admins || []);
      if (Array.isArray(payload.permissionCatalog) && payload.permissionCatalog.length) {
        setPermissionCatalog(payload.permissionCatalog);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao carregar admins.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handlePermissionToggle = (key: string, value: boolean) => {
    setForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: value,
      },
    }));
  };

  const handleEditPermissionToggle = (key: string, value: boolean) => {
    setEditingPermissions((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const openEditModal = (admin: AdminUserRow) => {
    setEditingAdmin(admin);
    setEditingPermissions(buildInitialPermissions());
    setEditingPermissions({
      ...buildInitialPermissions(),
      ...(admin.admin_permissions || {}),
    });
  };

  const closeEditModal = () => {
    setEditingAdmin(null);
    setEditingPermissions(buildInitialPermissions());
    setEditing(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canManageAdmins) return;

    setSaving(true);
    try {
      await api.admin.admins.create(form);
      toast.success('Admin level2 criado com sucesso.');
      setForm({
        name: '',
        email: '',
        password: '',
        permissions: buildInitialPermissions(),
      });
      await loadAdmins();
    } catch (err: any) {
      toast.error(err?.message || 'Nao foi possivel criar o admin.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePermissions = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canManageAdmins || !editingAdmin) return;

    setEditing(true);
    try {
      await api.admin.admins.updatePermissions(editingAdmin.id, editingPermissions);
      toast.success('Permissoes atualizadas com sucesso.');
      closeEditModal();
      await loadAdmins();
    } catch (err: any) {
      toast.error(err?.message || 'Nao foi possivel atualizar as permissoes.');
    } finally {
      setEditing(false);
    }
  };

  if (!canManageAdmins) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-slate-800">Administradores</h2>
        <p className="mt-2 text-slate-500">Apenas admin master pode gerenciar criacao de outros admins.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-fluxabank-600" />
          Admins e Permissoes Level2
        </h2>
        <p className="text-slate-500 text-sm mt-1">Crie novos admins e selecione permissoes operacionais.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            className="border border-slate-200 rounded-lg px-3 py-2"
            placeholder="Nome do admin"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
          <input
            type="email"
            className="border border-slate-200 rounded-lg px-3 py-2"
            placeholder="E-mail"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            required
          />
          <input
            type="password"
            className="border border-slate-200 rounded-lg px-3 py-2"
            placeholder="Senha provisoria"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            required
          />
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">Permissoes</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {permissionCatalog.map((permission) => (
              <label key={permission.key} className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2">
                <input
                  type="checkbox"
                  checked={Boolean(form.permissions[permission.key])}
                  onChange={(e) => handlePermissionToggle(permission.key, e.target.checked)}
                />
                {permission.label}
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 bg-slate-900 text-white rounded-lg px-4 py-2 font-medium hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          Criar Admin Level2
        </button>
      </form>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Admins cadastrados</h3>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-500" />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Permissoes</th>
                <th className="px-4 py-3 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-3 font-medium text-slate-800">{admin.name}</td>
                  <td className="px-4 py-3 text-slate-600">{admin.email}</td>
                  <td className="px-4 py-3 text-slate-600">{admin.isMaster ? 'Master' : 'Level2'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {admin.isMaster
                      ? 'Acesso total'
                      : permissionCatalog
                          .filter((permission) => admin.admin_permissions?.[permission.key])
                          .map((permission) => permission.label)
                          .join(', ') || 'Sem permissao'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!admin.isMaster && (
                      <button
                        type="button"
                        onClick={() => openEditModal(admin)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50"
                      >
                        <PencilLine className="w-4 h-4" />
                        Editar permissoes
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && admins.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Nenhum admin encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Editar permissoes</h3>
                <p className="text-sm text-slate-500 mt-1">{editingAdmin.name} - {editingAdmin.email}</p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePermissions} className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {permissionCatalog.map((permission) => (
                  <label key={permission.key} className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2">
                    <input
                      type="checkbox"
                      checked={Boolean(editingPermissions[permission.key])}
                      onChange={(e) => handleEditPermissionToggle(permission.key, e.target.checked)}
                    />
                    {permission.label}
                  </label>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editing}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {editing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PencilLine className="w-4 h-4" />}
                  Salvar permissoes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
