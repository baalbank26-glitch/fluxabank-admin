

import React from 'react';
import { AppView } from '../types/index';
import { api } from '../services/api';
import { ADMIN_PERMISSION_KEYS, hasAdminPermission, isMasterAdmin } from '../constants/adminPermissions';
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
    <div className="flex flex-col h-full bg-[#090d0a] border-r border-emerald-500/20">
      {/* Logo / Branding */}
      <div className="p-6 flex items-center gap-3 border-b border-emerald-500/20">
        <div className="w-10 h-10 rounded-xl bg-[#0f1713] border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
          <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 30 L20 10 L32 30 L26 30 L20 18 L14 30 Z" fill="#10b981"/>
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-white">VIPERPAG</h1>
          <p className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase">Admin Panel</p>
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
                w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-all duration-200
                ${isActive
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30 translate-x-1'
                  : 'text-slate-400 hover:bg-emerald-950/40 hover:text-emerald-400 hover:translate-x-1'
                }
              `}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-slate-950' : 'text-slate-400 group-hover:text-emerald-400'}`} />
              {item.label}
              {item.id === AppView.MED && (
                <span className="ml-auto w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-emerald-500/20">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-3 w-full rounded-xl text-sm font-bold text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sair do Sistema
        </button>
        <div className="mt-4 px-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs font-extrabold text-emerald-400">
            AD
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-extrabold text-white">Admin Master</span>
            <span className="text-[10px] text-emerald-400">● Logado</span>
          </div>
        </div>
      </div>
    </div >
  );
};
