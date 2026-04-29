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
    return <div className="flex items-center justify-center h-screen bg-white text-orange-600">
      <div className="w-12 h-12 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin"></div>
    </div>;
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar
          currentView={currentView}
          onViewChange={(view) => { setCurrentView(view); closeSidebar(); }}
          onLogout={handleLogout}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden bg-white border-b border-slate-100 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded flex items-center justify-center overflow-hidden">
              <img src="/fluxabank-logo.png" alt="Fluxabank" className="w-6 h-6 object-contain" />
            </div>
            <span className="font-bold text-slate-900">Fluxabank</span>
          </div>
          <button onClick={toggleSidebar} className="p-2 hover:bg-slate-50 rounded-md transition-colors">
            <Menu className="w-6 h-6 text-slate-600" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth bg-slate-50/50">
          <div className="max-w-7xl mx-auto">
            {renderView()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
