import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Lock,
  User,
  Upload,
  HardDrive,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
  LogOut,
  RefreshCw,
  Copy,
  Check,
  KeyRound,
  Server,
} from 'lucide-react';
import logoImg from '../assets/kivo-logo.png';
import { WindowsIcon, AppleIcon } from './Hero';

interface InstallerMetadata {
  platform: string;
  name: string;
  architecture: string;
  filename: string;
  version: string;
  size: number;
  sha256: string;
  uploadedAt: string;
  downloadUrl: string;
}

interface AdminPanelProps {
  onNavigateHome: () => void;
}

const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB chunks

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function pathBasename(p: string): string {
  const parts = p.split(/[\\/]/).filter(Boolean);
  return parts.slice(-2).join('/');
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onNavigateHome }) => {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string>('');

  // Installer states
  const [installers, setInstallers] = useState<Record<string, InstallerMetadata | null>>({
    windows: null,
    'mac-arm64': null,
    'mac-intel': null,
  });
  const [isLoadingInstallers, setIsLoadingInstallers] = useState(false);
  const [serverInfo, setServerInfo] = useState<{ uploadsDir?: string; maxFileSize?: number }>({});

  // Upload states per platform: Record<platform, UploadState>
  const [uploadProgress, setUploadProgress] = useState<
    Record<
      string,
      {
        inProgress: boolean;
        percent: number;
        uploadedBytes: number;
        totalBytes: number;
        chunkIndex: number;
        totalChunks: number;
        uploadId?: string;
        abortController?: AbortController;
        error?: string | null;
      }
    >
  >({});

  const [versionInputs, setVersionInputs] = useState<Record<string, string>>({
    windows: '1.0.0',
    'mac-arm64': '1.0.0',
    'mac-intel': '1.0.0',
  });

  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [deletingPlatform, setDeletingPlatform] = useState<string | null>(null);

  const fetchInstallers = useCallback(async (token?: string) => {
    setIsLoadingInstallers(true);
    try {
      const res = await fetch('/api/admin/installers', {
        headers: { 'X-CSRF-Token': token || csrfToken },
      });
      if (res.ok) {
        const data = await res.json();
        setInstallers(data.installers || {});
        setServerInfo({ uploadsDir: data.uploadsDir, maxFileSize: data.maxFileSize });
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
        setIsLoggingIn(false);
        return;
      }

      setIsAuthenticated(true);
      setCsrfToken(data.csrfToken || '');
      setPassword('');
      fetchInstallers(data.csrfToken);
    } catch {
      setLoginError('Unable to connect to server. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
      });
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
    setInstallers({ windows: null, 'mac-arm64': null, 'mac-intel': null });
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleDelete = async (platform: string) => {
    if (!window.confirm(`Are you sure you want to delete the ${platform} installer? This will remove the file from downloads.`)) {
      return;
    }
    setDeletingPlatform(platform);
    try {
      const res = await fetch(`/api/admin/installers/${platform}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
      });
      if (res.ok) {
        fetchInstallers();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to delete installer');
      }
    } catch {
      alert('Network error while deleting installer');
    } finally {
      setDeletingPlatform(null);
    }
  };

  // Perform Resumable Chunked Upload
  const startChunkedUpload = async (platform: string, file: File) => {
    const version = versionInputs[platform] || '1.0.0';
    const totalSize = file.size;
    const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
    const abortController = new AbortController();

    setUploadProgress((prev) => ({
      ...prev,
      [platform]: {
        inProgress: true,
        percent: 0,
        uploadedBytes: 0,
        totalBytes: totalSize,
        chunkIndex: 0,
        totalChunks,
        abortController,
        error: null,
      },
    }));

    try {
      // Step 1: Initialize Upload
      const initRes = await fetch('/api/admin/upload/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          platform,
          filename: file.name,
          version,
          totalSize,
          totalChunks,
        }),
        signal: abortController.signal,
      });

      if (!initRes.ok) {
        const errData = await initRes.json();
        throw new Error(errData.error || 'Failed to initialize upload session');
      }

      const { uploadId } = await initRes.json();

      setUploadProgress((prev) => ({
        ...prev,
        [platform]: { ...prev[platform], uploadId },
      }));

      // Step 2: Upload Chunks Sequentially
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, totalSize);
        const chunkBlob = file.slice(start, end);

        const chunkRes = await fetch(
          `/api/admin/upload/chunk?uploadId=${encodeURIComponent(uploadId)}&chunkIndex=${chunkIndex}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
              'X-CSRF-Token': csrfToken,
            },
            body: chunkBlob,
            signal: abortController.signal,
          }
        );

        if (!chunkRes.ok) {
          const chunkErr = await chunkRes.json();
          throw new Error(chunkErr.error || `Failed on chunk ${chunkIndex + 1} of ${totalChunks}`);
        }

        const currentUploadedBytes = Math.min((chunkIndex + 1) * CHUNK_SIZE, totalSize);
        const percent = Math.min(Math.round((currentUploadedBytes / totalSize) * 100), 99);

        setUploadProgress((prev) => ({
          ...prev,
          [platform]: {
            ...prev[platform],
            percent,
            uploadedBytes: currentUploadedBytes,
            chunkIndex: chunkIndex + 1,
          },
        }));
      }

      // Step 3: Complete & Assemble Upload
      const completeRes = await fetch('/api/admin/upload/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ uploadId }),
        signal: abortController.signal,
      });

      if (!completeRes.ok) {
        const completeErr = await completeRes.json();
        throw new Error(completeErr.error || 'Failed to assemble and verify upload');
      }

      setUploadProgress((prev) => ({
        ...prev,
        [platform]: {
          ...prev[platform],
          inProgress: false,
          percent: 100,
          uploadedBytes: totalSize,
        },
      }));

      // Refresh installer status
      fetchInstallers();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setUploadProgress((prev) => ({
          ...prev,
          [platform]: { ...prev[platform], inProgress: false, error: 'Upload cancelled.' },
        }));
      } else {
        setUploadProgress((prev) => ({
          ...prev,
          [platform]: { ...prev[platform], inProgress: false, error: err.message || 'Upload failed.' },
        }));
      }
    }
  };

  const cancelActiveUpload = async (platform: string) => {
    const cur = uploadProgress[platform];
    if (cur?.abortController) {
      cur.abortController.abort();
    }
    if (cur?.uploadId) {
      try {
        await fetch('/api/admin/upload/cancel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          body: JSON.stringify({ uploadId: cur.uploadId }),
        });
      } catch {
        // ignore
      }
    }
  };

  // -------------------------------------------------------------
  // Render: Loading Screen
  // -------------------------------------------------------------
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-kivo-bg text-slate-100 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-6 h-6 text-kivo-cyan animate-spin" />
          <span className="text-sm font-medium text-slate-300">Checking admin authorization...</span>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Render: Login Screen
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-kivo-bg text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-tr from-kivo-blue/20 via-kivo-cyan/15 to-kivo-purple/20 blur-[130px] rounded-full pointer-events-none -z-10 animate-ambient-orb" />

        {/* Top Header */}
        <header className="px-6 py-6 flex items-center justify-between border-b border-white/[0.06] backdrop-blur-md">
          <button
            onClick={onNavigateHome}
            type="button"
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to KIVO Website</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-300">
              Admin Portal • Restricted
            </span>
          </div>
        </header>

        {/* Login Box */}
        <div className="max-w-md w-full mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-3xl bg-[#090D18]/90 border border-white/[0.12] p-8 shadow-2xl backdrop-blur-2xl"
          >
            {/* Logo */}
            <div className="flex flex-col items-center text-center mb-8">
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 bg-kivo-cyan/20 blur-xl rounded-full" />
                <img src={logoImg} alt="KIVO Logo" className="w-full h-full object-contain relative z-10" />
              </div>
              <h2 className="text-2xl font-bold text-white font-display">
                KIVO Admin Access
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Release Management & Installer Control Center
              </p>
            </div>

            {/* Error Message */}
            {loginError && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </motion.div>
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
          © 2026 KIVO Browser • Release Operations
        </footer>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Render: Authenticated Admin Panel
  // -------------------------------------------------------------
  const platformsList = [
    {
      id: 'windows',
      name: 'Windows Desktop',
      architecture: '64-bit (x64)',
      ext: '.exe',
      icon: WindowsIcon,
      color: 'text-kivo-cyan',
      borderColor: 'border-kivo-blue/30',
      badgeColor: 'bg-kivo-blue/15 text-kivo-cyan border-kivo-blue/30',
      accept: '.exe,application/x-msdownload',
      description: 'Native Windows desktop installer for Windows 10 & 11.',
    },
    {
      id: 'mac-arm64',
      name: 'macOS Apple Silicon',
      architecture: 'Apple Silicon (M1/M2/M3/M4)',
      ext: '.dmg',
      icon: AppleIcon,
      color: 'text-kivo-purple',
      borderColor: 'border-kivo-purple/30',
      badgeColor: 'bg-kivo-purple/15 text-kivo-purple border-kivo-purple/30',
      accept: '.dmg,application/x-apple-diskimage',
      description: 'Native ARM64 disk image for Apple Silicon Macs.',
    },
    {
      id: 'mac-intel',
      name: 'macOS Intel',
      architecture: 'Intel 64-bit (x64)',
      ext: '.dmg',
      icon: AppleIcon,
      color: 'text-slate-200',
      borderColor: 'border-slate-500/30',
      badgeColor: 'bg-white/10 text-slate-200 border-white/20',
      accept: '.dmg,application/x-apple-diskimage',
      description: 'Native Intel x64 disk image for Intel-based Macs.',
    },
  ];

  return (
    <div className="min-h-screen bg-kivo-bg text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#070B14]/90 backdrop-blur-xl border-b border-white/[0.08] px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="KIVO" className="w-8 h-8 object-contain" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white font-display">KIVO Admin</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                  Authenticated
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Installer & Release Operations Hub</span>
            </div>
          </div>

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
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-10 flex-grow w-full">
        {/* Overview Bar */}
        <div className="mb-10 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-kivo-blue/15 text-kivo-blue flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Target Node.js Server</span>
              <span className="text-xs font-semibold text-white">GoDaddy Node.js Platform</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-kivo-cyan/15 text-kivo-cyan flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Storage Directory</span>
              <span className="text-xs font-semibold text-white font-mono truncate max-w-[220px] block" title={serverInfo.uploadsDir}>
                {serverInfo.uploadsDir ? pathBasename(serverInfo.uploadsDir) : 'Active Persistent Storage'}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-kivo-purple/15 text-kivo-purple flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Session Security</span>
              <span className="text-xs font-semibold text-white">HttpOnly + CSRF Protected</span>
            </div>
          </div>
        </div>

        {/* Section Heading */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white font-display">
              Desktop Installer Management
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Upload, verify, update, or remove the official binaries distributed to website visitors.
            </p>
          </div>

          <button
            onClick={() => fetchInstallers()}
            disabled={isLoadingInstallers}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-xs font-medium text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingInstallers ? 'animate-spin text-kivo-cyan' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* 3 Installer Upload Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          {platformsList.map((platform) => {
            const Icon = platform.icon;
            const current = installers[platform.id];
            const progress = uploadProgress[platform.id];
            const isUploading = progress?.inProgress;

            return (
              <div
                key={platform.id}
                className="rounded-3xl bg-gradient-to-b from-[#0D1426]/90 to-[#070B14]/95 border border-white/[0.1] p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
                        <Icon className={`w-5 h-5 ${platform.color}`} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white font-display">
                          {platform.name}
                        </h3>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {platform.architecture} • {platform.ext}
                        </span>
                      </div>
                    </div>

                    {current ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-semibold text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Live
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-[11px] font-semibold text-amber-300">
                        <Clock className="w-3.5 h-3.5" />
                        Missing
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                    {platform.description}
                  </p>

                  {/* Active Installer Info */}
                  {current ? (
                    <div className="mb-6 p-4 rounded-2xl bg-black/40 border border-white/[0.06] space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Active File:</span>
                        <span className="font-mono text-white font-semibold truncate max-w-[170px]" title={current.filename}>
                          {current.filename}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Release Version:</span>
                        <span className="font-mono text-kivo-cyan font-bold">{current.version}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">File Size:</span>
                        <span className="font-mono text-slate-200">{formatBytes(current.size)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Uploaded:</span>
                        <span className="text-slate-400 text-[11px]">
                          {new Date(current.uploadedAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* SHA-256 Checksum */}
                      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">SHA-256:</span>
                        <button
                          type="button"
                          onClick={() => handleCopyHash(current.sha256)}
                          className="flex items-center gap-1 font-mono text-kivo-cyan hover:underline text-[10px]"
                          title="Click to copy full checksum"
                        >
                          {copiedHash === current.sha256 ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>{current.sha256.substring(0, 10)}...</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Action buttons: Test Download & Delete */}
                      <div className="pt-2 flex items-center gap-2">
                        <a
                          href={current.downloadUrl}
                          download
                          className="flex-1 py-1.5 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-kivo-cyan" />
                          <span>Test Download</span>
                        </a>

                        <button
                          type="button"
                          disabled={deletingPlatform === platform.id}
                          onClick={() => handleDelete(platform.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition-colors"
                          title="Delete Installer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-6 p-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/[0.1] text-center">
                      <AlertCircle className="w-6 h-6 text-amber-400/80 mx-auto mb-2" />
                      <p className="text-xs text-slate-300 font-medium">No installer published yet</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        The website download button currently shows a graceful "Coming Soon" notification modal.
                      </p>
                    </div>
                  )}
                </div>

                {/* Upload / Replace Area */}
                <div className="pt-4 border-t border-white/[0.08]">
                  <h4 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-kivo-cyan" />
                    <span>{current ? 'Replace / Upgrade Installer' : 'Upload New Installer'}</span>
                  </h4>

                  {/* Version tag input */}
                  <div className="mb-3">
                    <label className="block text-[11px] text-slate-400 mb-1 font-medium">
                      Release Version Tag:
                    </label>
                    <input
                      type="text"
                      disabled={isUploading}
                      value={versionInputs[platform.id] || '1.0.0'}
                      onChange={(e) =>
                        setVersionInputs((prev) => ({ ...prev, [platform.id]: e.target.value }))
                      }
                      placeholder="e.g. 1.0.0"
                      className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/[0.1] text-xs font-mono text-white focus:outline-none focus:border-kivo-cyan"
                    />
                  </div>

                  {/* Upload Progress Bar if active */}
                  {isUploading && progress && (
                    <div className="mb-4 p-3.5 rounded-xl bg-black/50 border border-kivo-cyan/30 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium flex items-center gap-1.5">
                          <RefreshCw className="w-3 h-3 text-kivo-cyan animate-spin" />
                          Uploading {progress.chunkIndex}/{progress.totalChunks} chunks...
                        </span>
                        <span className="font-mono text-kivo-cyan font-bold">{progress.percent}%</span>
                      </div>

                      {/* Bar */}
                      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-kivo-blue via-kivo-cyan to-kivo-purple transition-all duration-200"
                          style={{ width: `${progress.percent}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>{formatBytes(progress.uploadedBytes)} of {formatBytes(progress.totalBytes)}</span>
                        <button
                          type="button"
                          onClick={() => cancelActiveUpload(platform.id)}
                          className="text-rose-400 hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Error feedback if failed */}
                  {progress?.error && (
                    <div className="mb-3 p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{progress.error}</span>
                    </div>
                  )}

                  {/* File Selector Button */}
                  {!isUploading && (
                    <div>
                      <label className="w-full py-2.5 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.12] hover:border-kivo-cyan/40 text-xs font-semibold text-slate-200 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer group">
                        <Upload className="w-4 h-4 text-kivo-cyan group-hover:scale-110 transition-transform" />
                        <span>Select {platform.ext} File (up to 2 GB)</span>
                        <input
                          type="file"
                          accept={platform.accept}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              startChunkedUpload(platform.id, file);
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* GoDaddy Hosting Configuration Reference */}
        <div className="rounded-3xl bg-[#090D18] border border-white/[0.08] p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-kivo-blue/20 text-kivo-cyan flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">
                GoDaddy Node.js Hosting — Environment Variables
              </h3>
              <p className="text-xs text-slate-400">
                Configure these variables in your GoDaddy cPanel or Node.js Deployments Dashboard
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.05]">
              <span className="font-mono text-kivo-cyan font-semibold block mb-1">KIVO_ADMIN_USERNAME</span>
              <p className="text-slate-400">Username for logging into this panel. Configured in your host environment.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.05]">
              <span className="font-mono text-kivo-cyan font-semibold block mb-1">KIVO_ADMIN_PASSWORD</span>
              <p className="text-slate-400">Password for logging into this panel. Store securely in your host environment secrets.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.05]">
              <span className="font-mono text-kivo-cyan font-semibold block mb-1">UPLOADS_DIR</span>
              <p className="text-slate-400">Custom persistent storage path (e.g. <code className="text-slate-200">/home/user/kivo_storage</code>) so redeployments never overwrite installers.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.05]">
              <span className="font-mono text-kivo-cyan font-semibold block mb-1">SESSION_SECRET</span>
              <p className="text-slate-400">A 32+ character random secret used for cryptographic HMAC-SHA256 session token signatures.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-500 border-t border-white/[0.04]">
        KIVO Browser • Official Admin Hub • Protected by Rate Limiting & Cryptographic Sessions
      </footer>
    </div>
  );
};
