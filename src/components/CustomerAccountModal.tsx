import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  LifeBuoy,
  Download,
  LogOut,
  Sparkles,
} from 'lucide-react';
import logoImg from '../assets/kivo-logo.png';

interface CustomerAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTrackTicket?: (ticketId?: string) => void;
  onOpenSupportModal?: () => void;
  onUserChange?: (user: { name: string; email: string } | null) => void;
}

export const CustomerAccountModal: React.FC<CustomerAccountModalProps> = ({
  isOpen,
  onClose,
  onNavigateTrackTicket,
  onOpenSupportModal,
  onUserChange,
}) => {
  // Modes: 'login' | 'register' | 'forgot' | 'dashboard'
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'dashboard'>('login');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt?: string;
  } | null>(null);

  // Check login state on modal open
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
      checkUserAuth();
    }
  }, [isOpen]);

  const checkUserAuth = async () => {
    try {
      const res = await fetch('/api/customer/me');
      const data = await res.json();
      if (data.authenticated && data.user) {
        setCurrentUser(data.user);
        setMode('dashboard');
        if (onUserChange) onUserChange(data.user);
      } else {
        setCurrentUser(null);
        if (onUserChange) onUserChange(null);
      }
    } catch {
      // Ignore network errors
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/customer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed.');

      setCurrentUser(data.user);
      setMode('dashboard');
      setSuccessMessage('Account created successfully! Welcome to KIVO.');
      if (onUserChange) onUserChange(data.user);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed.');

      setCurrentUser(data.user);
      setMode('dashboard');
      if (onUserChange) onUserChange(data.user);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/customer/logout', { method: 'POST' });
      setCurrentUser(null);
      setMode('login');
      if (onUserChange) onUserChange(null);
    } catch {
      // Ignore
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/customer/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setSuccessMessage(data.message || 'If an account exists, instructions have been sent.');
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-[#0D152A] to-[#070B16] border border-white/[0.1] p-6 sm:p-8 shadow-2xl text-slate-100"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Modal Header */}
          <div className="flex items-center gap-3 mb-6">
            <img src={logoImg} alt="KIVO" className="w-9 h-9 object-contain" />
            <div>
              <h3 className="text-lg font-bold text-white font-display">
                {mode === 'dashboard'
                  ? 'Customer Account'
                  : mode === 'register'
                  ? 'Create Your Account'
                  : mode === 'forgot'
                  ? 'Reset Your Password'
                  : 'Customer Sign In'}
              </h3>
              <p className="text-xs text-slate-400">
                {mode === 'dashboard'
                  ? 'Manage your KIVO Browser downloads & tickets'
                  : 'Secure access to your personal KIVO workspace'}
              </p>
            </div>
          </div>

          {/* Alert Messages */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1. Dashboard View */}
          {mode === 'dashboard' && currentUser && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    Customer Profile
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-kivo-cyan/15 text-kivo-cyan border border-kivo-cyan/30">
                    Verified User
                  </span>
                </div>
                <div className="text-base font-bold text-white">{currentUser.name}</div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">{currentUser.email}</div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-2.5">
                <a
                  href="/#download"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-xs font-semibold text-white flex items-center justify-between transition-colors border border-white/[0.08]"
                >
                  <span className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-kivo-cyan" />
                    Download Desktop Installers
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </a>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onNavigateTrackTicket) onNavigateTrackTicket();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-xs font-semibold text-white flex items-center justify-between transition-colors border border-white/[0.08]"
                >
                  <span className="flex items-center gap-2">
                    <LifeBuoy className="w-4 h-4 text-emerald-400" />
                    Track My Support Tickets
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenSupportModal) onOpenSupportModal();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-xs font-semibold text-white flex items-center justify-between transition-colors border border-white/[0.08]"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Create New Support Ticket
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>

              {/* Sign out */}
              <div className="pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-2 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-400 flex items-center justify-center gap-2 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}

          {/* 2. Login Form */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sarah@example.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-kivo-cyan"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-300">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setSuccessMessage(null);
                      setMode('forgot');
                    }}
                    className="text-[11px] text-kivo-cyan hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-kivo-cyan"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-kivo-blue to-kivo-cyan text-white text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-kivo-blue/20"
              >
                <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="text-center text-xs text-slate-400 pt-2">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setSuccessMessage(null);
                    setMode('register');
                  }}
                  className="text-kivo-cyan font-semibold hover:underline"
                >
                  Create one now
                </button>
              </div>
            </form>
          )}

          {/* 3. Register Form */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Sarah Connor"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-kivo-cyan"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sarah@example.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-kivo-cyan"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Create Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-kivo-cyan"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-kivo-blue to-kivo-cyan text-white text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-kivo-blue/20"
              >
                <span>{isLoading ? 'Creating Account...' : 'Register Account'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="text-center text-xs text-slate-400 pt-2">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setSuccessMessage(null);
                    setMode('login');
                  }}
                  className="text-kivo-cyan font-semibold hover:underline"
                >
                  Sign in here
                </button>
              </div>
            </form>
          )}

          {/* 4. Forgot Password */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Registered Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sarah@example.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-kivo-cyan"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-kivo-blue text-white text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <span>{isLoading ? 'Sending...' : 'Send Password Reset Link'}</span>
              </button>

              <div className="text-center text-xs text-slate-400 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setSuccessMessage(null);
                    setMode('login');
                  }}
                  className="text-kivo-cyan hover:underline"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
