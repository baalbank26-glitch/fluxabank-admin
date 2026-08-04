

import React, { useState, useEffect } from 'react';
import { Sidebar } from './components';
import { Dashboard, Clients, Treasury, Approvals, Settings, Login, MED, Providers, WebhooksHistory, WebhookSettings, TransactionMapper, Security, Authenticator, OTC, Admins } from './pages';
import { AppView } from './types/index';
import { Menu } from 'lucide-react';
import { api } from './services/api';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (api.auth.isAuthenticated()) {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const handleLogin = () => setIsAuthenticated(true);
  const handleLogout = () => {
    api.auth.logout();
    setIsAuthenticated(false);
    setCurrentView(AppView.DASHBOARD);
  };

  const renderView = () => {
    switch (currentView) {
      case AppView.CLIENTS:
        return <Clients />;
      case AppView.TREASURY:
        return <Treasury />;
      case AppView.APPROVALS:
        return <Approvals />;
      case AppView.MED:
        return <MED />;
      case AppView.SETTINGS:
        return <Settings />;
      case AppView.PROVIDERS:
        return <Providers />;
      case AppView.WEBHOOKS:
        return <WebhooksHistory />;
      case AppView.WEBHOOK_SETTINGS:
        return <WebhookSettings />;
      case AppView.WEBHOOK_MAPPER:
        return <TransactionMapper />;
      case AppView.SECURITY:
        return <Security />;
      case AppView.AUTHENTICATOR:
        return <Authenticator />;
      case AppView.OTC:
        return <OTC />;
      case AppView.ADMINS:
        return <Admins />;
      case AppView.DASHBOARD:
      default:
        return <Dashboard onViewChange={setCurrentView} />;
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen bg-[#090d0a] text-emerald-400 font-bold tracking-wider">Carregando...</div>;
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-[#090d0a] overflow-hidden">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-20 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-[#090d0a] text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar
          currentView={currentView}
          onViewChange={(view) => { setCurrentView(view); closeSidebar(); }}
          onLogout={handleLogout}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden bg-[#0f1713] border-b border-emerald-500/20 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#090d0a] border border-emerald-500/30 flex items-center justify-center">
              <svg viewBox="0 0 40 40" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 30 L20 10 L32 30 L26 30 L20 18 L14 30 Z" fill="#10b981"/>
              </svg>
            </div>
            <span className="font-extrabold text-white tracking-tight">VIPERPAG</span>
          </div>
          <button onClick={toggleSidebar} className="p-2 hover:bg-emerald-950/40 rounded-xl">
            <Menu className="w-6 h-6 text-slate-400" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth bg-[#090d0a]">
          <div className="max-w-7xl mx-auto">
            {renderView()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;