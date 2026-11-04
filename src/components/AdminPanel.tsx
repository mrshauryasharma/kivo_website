import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Lock,
  User,
  ArrowLeft,
  LogOut,
  RefreshCw,
  KeyRound,
  Download,
  FileEdit,
  LifeBuoy,
} from 'lucide-react';
import logoImg from '../assets/kivo-logo.png';
import { AdminInstallersTab } from './admin/AdminInstallersTab';
import type { InstallerMetadata } from './admin/AdminInstallersTab';
import { AdminCmsTab } from './admin/AdminCmsTab';
import { AdminTicketsTab } from './admin/AdminTicketsTab';

interface AdminPanelProps {
  onNavigateHome: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onNavigateHome }) => {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string>('');
  
  // Navigation tabs: 'installers' | 'cms' | 'tickets'
  const [activeTab, setActiveTab] = useState<'installers' | 'cms' | 'tickets'>('installers');

  // Installer states
  const [installers, setInstallers] = useState<Record<string, InstallerMetadata | null>>({
    windows: null,
    'mac-arm64': null,
    'mac-intel': null,
  });
  const [isLoadingInstallers, setIsLoadingInstallers] = useState(false);
  const [serverInfo, setServerInfo] = useState<{ uploadsDir?: string; dataDir?: string; maxFileSize?: number }>({});

  const fetchInstallers = useCallback(async (token?: string) => {
    setIsLoadingInstallers(true);
    try {
      const res = await fetch('/api/admin/installers', {
        headers: { 'X-CSRF-Token': token || csrfToken },
      });
      if (res.ok) {
        const data = await res.json();
        setInstallers(data.installers || {});
        setServerInfo({
          uploadsDir: data.uploadsDir,
          dataDir: data.dataDir,
          maxFileSize: data.maxFileSize,
        });
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingInstallers(false);
    }
  }, [csrfToken]);

  // Check existing session on mount
  useEffect(() => {
    let isCancelled = false;
    const runAuthCheck = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (isCancelled) return;
        if (data.authenticated) {
          setIsAuthenticated(true);
          setCsrfToken(data.csrfToken || '');
          fetchInstallers(data.csrfToken);
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        if (!isCancelled) {
          setIsAuthenticated(false);
        }
      }
    };
    runAuthCheck();
    return () => {
      isCancelled = true;
    };
  }, [fetchInstallers]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.error || 'Login failed. Please check credentials.');
        return;
      }

      setIsAuthenticated(true);
      setCsrfToken(data.csrfToken || '');
      setPassword('');
      fetchInstallers(data.csrfToken);
    } catch {
      setLoginError('Network error while attempting to connect to server.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrfToken },
      });
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
    setCsrfToken('');
  };

  // Loading state while verifying existing session
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-kivo-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-kivo-cyan/30 border-t-kivo-cyan rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-mono">Verifying administrative security session...</span>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Render: Login Screen (If not authenticated)
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-kivo-bg text-slate-100 flex flex-col justify-between font-sans relative overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-tr from-kivo-blue/20 via-kivo-cyan/15 to-kivo-purple/20 blur-[130px] rounded-full pointer-events-none -z-10" />

        {/* Header */}
        <header className="px-6 py-6 flex items-center justify-between border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="KIVO" className="w-8 h-8 object-contain" />
            <span className="text-xl font-bold tracking-tight text-white font-display">
              KIVO <span className="text-kivo-cyan font-mono text-sm">Control Portal</span>
            </span>
          </div>

          <button
            onClick={onNavigateHome}
            type="button"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white border border-white/[0.08] transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Site</span>
          </button>
        </header>

        {/* Login Box */}
        <div className="flex-grow flex items-center justify-center px-4 py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md rounded-3xl bg-gradient-to-b from-[#0F1628]/90 via-[#0A0F1D]/90 to-[#070B14]/95 border border-white/[0.1] p-8 sm:p-10 backdrop-blur-2xl shadow-2xl relative overflow-hidden"
          >
            <div className="text-center mb-8">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-kivo-blue/20 to-kivo-cyan/20 border border-kivo-cyan/30 flex items-center justify-center text-kivo-cyan shadow-lg mb-4">
                <Lock className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-extrabold text-white font-display tracking-tight">
                KIVO Administration
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter your administrative credentials to manage installers, CMS content, and customer support tickets.
              </p>
            </div>

            {loginError && (
              <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Admin Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/[0.1] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-kivo-cyan focus:ring-1 focus:ring-kivo-cyan"
                    placeholder="kivoadminshaurya"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/[0.1] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-kivo-cyan focus:ring-1 focus:ring-kivo-cyan"
                    placeholder="Enter admin password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-kivo-blue via-kivo-cyan to-kivo-purple font-semibold text-white text-sm shadow-lg shadow-kivo-blue/20 hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Unlock Admin Panel</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-white/[0.08] text-center">
              <span className="text-[11px] text-slate-500">
                Protected by rate limiting & encrypted HttpOnly session auth.
              </span>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <footer className="py-6 text-center text-xs text-slate-500 border-t border-white/[0.04]">
          © 2026 KIVO Browser • Release Operations & Administration
        </footer>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Render: Authenticated Admin Portal with 3 Core Modules
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-kivo-bg text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#070B14]/90 backdrop-blur-xl border-b border-white/[0.08] px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="KIVO" className="w-8 h-8 object-contain" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white font-display">KIVO Admin</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                  Authenticated
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Release, Content & Support Management</span>
            </div>
          </div>

          {/* Central Module Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setActiveTab('installers')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'installers'
                  ? 'bg-kivo-cyan/20 text-kivo-cyan border border-kivo-cyan/30 shadow'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Installers & Storage</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cms')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'cms'
                  ? 'bg-kivo-cyan/20 text-kivo-cyan border border-kivo-cyan/30 shadow'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span>Website CMS</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tickets')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'tickets'
                  ? 'bg-kivo-cyan/20 text-kivo-cyan border border-kivo-cyan/30 shadow'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <LifeBuoy className="w-3.5 h-3.5" />
              <span>Support Tickets</span>
            </button>
          </div>

          {/* Top Right Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateHome}
              type="button"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white border border-white/[0.08] transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>View Website</span>
            </button>

            <button
              onClick={handleLogout}
              type="button"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-300 border border-rose-500/20 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Pane */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 flex-grow w-full">
        {activeTab === 'installers' && (
          <AdminInstallersTab
            installers={installers}
            serverInfo={serverInfo}
            isLoading={isLoadingInstallers}
            onRefresh={() => fetchInstallers()}
            csrfToken={csrfToken}
          />
        )}

        {activeTab === 'cms' && <AdminCmsTab csrfToken={csrfToken} />}

        {activeTab === 'tickets' && <AdminTicketsTab csrfToken={csrfToken} />}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-500 border-t border-white/[0.04]">
        © 2026 KIVO Browser • Release Operations & Administration
      </footer>
    </div>
  );
};
