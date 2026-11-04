import React, { useState } from 'react';
import {
  Server,
  HardDrive,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  Clock,
  Upload,
  Download,
  Trash2,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';
import { WindowsIcon, AppleIcon } from '../Hero';

export interface InstallerMetadata {
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

interface AdminInstallersTabProps {
  installers: Record<string, InstallerMetadata | null>;
  serverInfo: { uploadsDir?: string; dataDir?: string; maxFileSize?: number };
  isLoading: boolean;
  onRefresh: () => void;
  csrfToken: string;
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

export const AdminInstallersTab: React.FC<AdminInstallersTabProps> = ({
  installers,
  serverInfo,
  isLoading,
  onRefresh,
  csrfToken,
}) => {
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

  const handleCopyHash = (hash: string, platformId: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(platformId);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleDeleteInstaller = async (platformId: string) => {
    if (!window.confirm(`Are you sure you want to delete the active installer for ${platformId}?`)) {
      return;
    }

    setDeletingPlatform(platformId);
    try {
      const res = await fetch(`/api/admin/installers/${platformId}`, {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': csrfToken },
      });
      if (res.ok) {
        onRefresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete installer.');
      }
    } catch {
      alert('Network error while deleting installer.');
    } finally {
      setDeletingPlatform(null);
    }
  };

  const handleCancelUpload = async (platformId: string) => {
    const state = uploadProgress[platformId];
    if (state?.abortController) {
      state.abortController.abort();
    }
    if (state?.uploadId) {
      try {
        await fetch('/api/admin/upload/cancel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          body: JSON.stringify({ uploadId: state.uploadId }),
        });
      } catch {
        // ignore
      }
    }

    setUploadProgress((prev) => ({
      ...prev,
      [platformId]: {
        inProgress: false,
        percent: 0,
        uploadedBytes: 0,
        totalBytes: 0,
        chunkIndex: 0,
        totalChunks: 0,
        error: 'Upload cancelled by user.',
      },
    }));
  };

  const handleFileUpload = async (platformId: string, file: File) => {
    const totalSize = file.size;
    const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
    const abortController = new AbortController();
    const version = versionInputs[platformId] || '1.0.0';

    setUploadProgress((prev) => ({
      ...prev,
      [platformId]: {
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
      // Step 1: Init upload
      const initRes = await fetch('/api/admin/upload/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          platform: platformId,
          filename: file.name,
          version,
          totalSize,
          totalChunks,
        }),
        signal: abortController.signal,
      });

      const initData = await initRes.json();
      if (!initRes.ok) {
        throw new Error(initData.error || 'Failed to initialize upload session.');
      }

      const uploadId = initData.uploadId;
      setUploadProgress((prev) => ({
        ...prev,
        [platformId]: {
          ...prev[platformId],
          uploadId,
        },
      }));

      // Step 2: Upload chunks sequentially
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, totalSize);
        const chunkBlob = file.slice(start, end);
        const chunkBuffer = await chunkBlob.arrayBuffer();

        let retryCount = 0;
        let chunkUploaded = false;

        while (!chunkUploaded && retryCount < 3) {
          try {
            const chunkRes = await fetch(
              `/api/admin/upload/chunk?uploadId=${uploadId}&chunkIndex=${i}`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/octet-stream',
                  'X-CSRF-Token': csrfToken,
                  'X-Upload-ID': uploadId,
                  'X-Chunk-Index': i.toString(),
                },
                body: chunkBuffer,
                signal: abortController.signal,
              }
            );

            if (chunkRes.ok) {
              chunkUploaded = true;
            } else {
              retryCount++;
              if (retryCount >= 3) {
                const errData = await chunkRes.json();
                throw new Error(errData.error || `Chunk ${i + 1} upload failed.`);
              }
            }
          } catch (chunkErr: any) {
            if (abortController.signal.aborted) throw chunkErr;
            retryCount++;
            if (retryCount >= 3) throw chunkErr;
            await new Promise((r) => setTimeout(r, 1000));
          }
        }

        const uploadedBytes = end;
        const percent = Math.round((uploadedBytes / totalSize) * 100);

        setUploadProgress((prev) => ({
          ...prev,
          [platformId]: {
            ...prev[platformId],
            chunkIndex: i + 1,
            uploadedBytes,
            percent,
          },
        }));
      }

      // Step 3: Complete upload
      const completeRes = await fetch('/api/admin/upload/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ uploadId }),
        signal: abortController.signal,
      });

      const completeData = await completeRes.json();
      if (!completeRes.ok) {
        throw new Error(completeData.error || 'Failed to assemble and finalize upload.');
      }

      setUploadProgress((prev) => ({
        ...prev,
        [platformId]: {
          inProgress: false,
          percent: 100,
          uploadedBytes: totalSize,
          totalBytes: totalSize,
          chunkIndex: totalChunks,
          totalChunks,
          error: null,
        },
      }));

      onRefresh();
    } catch (err: any) {
      if (!abortController.signal.aborted) {
        setUploadProgress((prev) => ({
          ...prev,
          [platformId]: {
            inProgress: false,
            percent: prev[platformId]?.percent || 0,
            uploadedBytes: prev[platformId]?.uploadedBytes || 0,
            totalBytes: prev[platformId]?.totalBytes || totalSize,
            chunkIndex: prev[platformId]?.chunkIndex || 0,
            totalChunks: prev[platformId]?.totalChunks || totalChunks,
            error: err.message || 'Upload failed.',
          },
        }));
      }
    }
  };

  return (
    <div>
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
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Persistent Storage Directory</span>
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
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Storage Protection</span>
            <span className="text-xs font-semibold text-white">Atomic Swap & SHA-256 Verified</span>
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
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-xs font-medium text-slate-300 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-kivo-cyan' : ''}`} />
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

                {/* Active Live Details */}
                {current && (
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] space-y-3 mb-5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Version:</span>
                      <span className="font-semibold text-white font-mono">{current.version}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">File Size:</span>
                      <span className="font-semibold text-white font-mono">{formatBytes(current.size)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">File Name:</span>
                      <span className="font-mono text-slate-200 truncate max-w-[150px]" title={current.filename}>
                        {current.filename}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-white/[0.06]">
                      <span className="text-slate-400">SHA-256 Checksum:</span>
                      <button
                        type="button"
                        onClick={() => handleCopyHash(current.sha256, platform.id)}
                        className="inline-flex items-center gap-1 text-[11px] text-kivo-cyan hover:underline font-mono"
                      >
                        {copiedHash === platform.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>{current.sha256.slice(0, 10)}...</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <a
                        href={current.downloadUrl}
                        download
                        className="flex-1 py-1.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-center text-xs font-medium text-slate-200 hover:text-white transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Verify Stream</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteInstaller(platform.id)}
                        disabled={deletingPlatform === platform.id}
                        className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                        title="Delete Installer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Upload Form */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Release Version
                    </label>
                    <input
                      type="text"
                      disabled={isUploading}
                      value={versionInputs[platform.id]}
                      onChange={(e) =>
                        setVersionInputs((prev) => ({ ...prev, [platform.id]: e.target.value }))
                      }
                      placeholder="1.0.0"
                      className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-kivo-cyan"
                    />
                  </div>

                  {/* Upload Progress Bar */}
                  {isUploading && (
                    <div className="p-3 rounded-2xl bg-kivo-blue/10 border border-kivo-blue/30 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-kivo-cyan">
                          Uploading {progress.percent}%
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          Chunk {progress.chunkIndex}/{progress.totalChunks}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-kivo-blue to-kivo-cyan transition-all duration-300"
                          style={{ width: `${progress.percent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{formatBytes(progress.uploadedBytes)} of {formatBytes(progress.totalBytes)}</span>
                        <button
                          type="button"
                          onClick={() => handleCancelUpload(platform.id)}
                          className="text-rose-400 hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Upload Error Banner */}
                  {progress?.error && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span className="truncate">{progress.error}</span>
                    </div>
                  )}

                  {/* File Pick / Drop Button */}
                  <label
                    className={`block w-full py-3 px-4 rounded-2xl border-2 border-dashed ${
                      isUploading
                        ? 'opacity-40 pointer-events-none border-white/10'
                        : 'border-white/15 hover:border-kivo-cyan/50 hover:bg-white/[0.02] cursor-pointer'
                    } text-center transition-all`}
                  >
                    <Upload className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-200 block">
                      {current ? 'Replace Existing Installer' : `Upload ${platform.name}`}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Accepts {platform.ext} (up to 2 GB)
                    </span>
                    <input
                      type="file"
                      disabled={isUploading}
                      accept={platform.accept}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload(platform.id, file);
                          e.target.value = '';
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
