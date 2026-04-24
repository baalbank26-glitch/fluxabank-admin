

import React from 'react';
import { AppView } from '../types/index';
import { api } from '../services/api';
import { ADMIN_PERMISSION_KEYS, hasAdminPermission, isMasterAdmin } from '../constants/adminPermissions';
import { BAALLogo } from './BAALLogo';
import {
  LayoutDashboard,
  Users,
  Wallet,
  UserCheck,
  Settings,
  LogOut,
  Infinity,
  Siren,
  Building2,
  History,
  Shield,
  KeyRound,
  Bitcoin,
  Compass
} from 'lucide-react';

interface SidebarProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, onLogout }) => {
  const profile = api.auth.getProfile();
  const canManageMaintenance = hasAdminPermission(profile, ADMIN_PERMISSION_KEYS.TOGGLE_MAINTENANCE);
  const canViewSecurity = hasAdminPermission(profile, ADMIN_PERMISSION_KEYS.MANAGE_WEBHOOKS_WHITELIST);
  const canManageOtc = hasAdminPermission(profile, ADMIN_PERMISSION_KEYS.MANAGE_OTC);
  const canEditProviders = hasAdminPermission(profile, ADMIN_PERMISSION_KEYS.EDIT_PROVIDERS);
  const canManageAdmins = isMasterAdmin(profile);

  const menuItems = [
    { id: AppView.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: AppView.CLIENTS, label: 'Gestão de Usuários', icon: Users },
    { id: AppView.TREASURY, label: 'Tesouraria', icon: Wallet },
    { id: AppView.APPROVALS, label: 'Aprovações', icon: UserCheck },
    { id: AppView.MED, label: 'MED / Disputas', icon: Siren },
    { id: AppView.OTC, label: 'OTC / Cripto', icon: Bitcoin, visible: canManageOtc },
    { id: AppView.PROVIDERS, label: 'Providers', icon: Building2, visible: canEditProviders },
    { id: AppView.SECURITY, label: 'Segurança / IDS', icon: Shield, visible: canViewSecurity },
    { id: AppView.AUTHENTICATOR, label: 'Authenticator 2FA', icon: KeyRound },
    { id: AppView.WEBHOOKS, label: 'Webhooks', icon: History },
    { id: AppView.WEBHOOK_SETTINGS, label: 'Webhook Settings', icon: Settings, visible: canViewSecurity },
    { id: AppView.WEBHOOK_MAPPER, label: 'Mapeador Transação', icon: Compass },
    { id: AppView.SETTINGS, label: 'Configurações', icon: Settings, visible: canManageMaintenance },
    { id: AppView.ADMINS, label: 'Admins', icon: Infinity, visible: canManageAdmins },
  ].filter((item) => item.visible !== false);

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800">
      <div className="p-6 flex items-center gap-3 border-b border-slate-700">
        <BAALLogo size="md" />
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">BAAL</h1>
          <p className="text-xs text-slate-400 font-medium tracking-wider uppercase">Baal Admin</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1">
        {menuItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-baal-600 text-white shadow-md shadow-baal-900/20 translate-x-1'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100 hover:translate-x-1'
                }
              `}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} />
              {item.label}
              {item.id === AppView.MED && (
                <span className="ml-auto w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-3 w-full rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sair do Sistema
        </button>
        <div className="mt-4 px-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-bold text-slate-300 ring-2 ring-slate-800">
            AD
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-200">Admin Master</span>
            <span className="text-[10px] text-slate-500">Logado</span>
          </div>
        </div>
      </div>
    </div >
  );
};
