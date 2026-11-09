import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  Info,
  Clock,
  Bell,
  Cpu,
} from 'lucide-react';
import { DOWNLOAD_CONFIG } from '../config/downloadConfig';
import type { PlatformDownloadConfig } from '../config/downloadConfig';
import { WindowsIcon, AppleIcon, AndroidIcon } from './Hero';
import { MagneticButton } from './MagneticButton';

interface DownloadSectionProps {
  onOpenEarlyAccess: (platform: 'windows' | 'macos' | 'android') => void;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `~${Math.round(bytes / Math.pow(k, i))} ${sizes[i]}`;
}

export const DownloadSection: React.FC<DownloadSectionProps> = ({ onOpenEarlyAccess }) => {
  const { android, windows, macos, latestVersion, releaseDate } = DOWNLOAD_CONFIG;

  // Live installer availability from backend
  const [liveStatus, setLiveStatus] = useState<Record<string, any>>({});
  const [selectedMacArch, setSelectedMacArch] = useState<'arm64' | 'intel'>('arm64');

  useEffect(() => {
    fetch('/api/downloads/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setLiveStatus(data);
      })
      .catch(() => {});
  }, []);

  // Compute live properties for Android
  const androidLive = liveStatus['android'];
  const androidAvailable = Boolean(androidLive?.available);
  const androidDownloadUrl = androidAvailable ? androidLive.downloadUrl : android.downloadUrl;
  const androidVersion = androidAvailable && androidLive.version ? androidLive.version : android.version;
  const androidSize = androidAvailable && androidLive.size ? formatBytes(androidLive.size) : android.fileSize;

  // Compute live properties for Windows
  const winLive = liveStatus['windows'];
  const winAvailable = Boolean(winLive?.available);
  const winDownloadUrl = winAvailable ? winLive.downloadUrl : windows.downloadUrl;
  const winVersion = winAvailable && winLive.version ? winLive.version : windows.version;
  const winSize = winAvailable && winLive.size ? formatBytes(winLive.size) : windows.fileSize;

  const macArmLive = liveStatus['mac-arm64'];
  const macIntelLive = liveStatus['mac-intel'];
  const macArmAvailable = Boolean(macArmLive?.available);
  const macIntelAvailable = Boolean(macIntelLive?.available);

  // Active selected mac target
  const activeMacLive = selectedMacArch === 'arm64' ? macArmLive : macIntelLive;
  const macAvailable = Boolean(activeMacLive?.available);
  const macDownloadUrl = macAvailable ? activeMacLive.downloadUrl : macos.downloadUrl;
  const macVersion = macAvailable && activeMacLive.version ? activeMacLive.version : macos.version;
  const macSize = macAvailable && activeMacLive.size ? formatBytes(activeMacLive.size) : macos.fileSize;

  // Track last click timestamp per platform to prevent accidental rapid double-clicks
  const lastClickTimeRef = useRef<Record<string, number>>({});

  const handleDownloadClick = (e: React.MouseEvent, config: PlatformDownloadConfig, activeUrl?: string | null) => {
    // Prevent event bubbling to parent containers
    e.stopPropagation();

    const targetUrl = activeUrl !== undefined ? activeUrl : config.downloadUrl;

    if (!targetUrl) {
      e.preventDefault();
      onOpenEarlyAccess(config.platform);
      return;
    }

    // Debounce rapid repeated clicks within 1500ms
    const now = Date.now();
    const lastClick = lastClickTimeRef.current[config.platform] || 0;
    if (now - lastClick < 1500) {
      e.preventDefault();
      return;
    }
    lastClickTimeRef.current[config.platform] = now;

    // If triggered on an anchor tag with a valid href and download attribute,
    // do NOT invoke window.location.href, which causes duplicate downloads.
    // The native anchor click handles the single download cleanly.
    const currentTarget = e.currentTarget as HTMLElement | null;
    const isAnchorWithHref =
      currentTarget instanceof HTMLAnchorElement &&
      Boolean(currentTarget.getAttribute('href')) &&
      currentTarget.getAttribute('href') !== '#';

    if (!isAnchorWithHref) {
      window.location.href = targetUrl;
    }
  };

  return (
    <section id="download" className="py-24 sm:py-32 relative overflow-hidden bg-[#060912]">
      {/* Background ambient lighting with organic drift */}
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[600px] h-[600px] bg-kivo-blue/15 blur-[160px] rounded-full pointer-events-none animate-ambient-orb" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-kivo-purple/15 blur-[160px] rounded-full pointer-events-none animate-pulse-glow" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-semibold text-kivo-cyan mb-4"
          >
            <Download className="w-3.5 h-3.5 text-kivo-cyan" />
            <span>Official Releases (Android • Windows • macOS)</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-display mb-6"
          >
            Your Next Browser{' '}
            <span className="text-gradient-kivo">
              Is Here.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-base sm:text-lg text-slate-400 leading-relaxed font-normal"
          >
            Experience lightning-fast browsing on mobile and desktop. Download KIVO today.
          </motion.p>
        </div>

        {/* 1. Android Download Card - FIRST and MOST PROMINENT */}
        <div className="max-w-5xl mx-auto mb-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="group relative rounded-3xl bg-gradient-to-b from-[#0B1A1E]/95 via-[#07131B]/95 to-[#060912]/95 border border-emerald-500/30 hover:border-emerald-400/60 p-8 sm:p-10 backdrop-blur-2xl shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_45px_rgba(16,185,129,0.22)] overflow-hidden"
          >
            {/* Accent ambient corner glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-kivo-cyan/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7">
                {/* Card Header: Platform Icon + Status */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
                      <AndroidIcon className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-bold tracking-wide uppercase text-emerald-400">
                        Featured Mobile Release
                      </span>
                    </div>
                  </div>

                  {androidAvailable ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs font-semibold text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Available Now
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-xs font-semibold text-amber-300">
                      <Clock className="w-3.5 h-3.5 text-amber-300" />
                      Coming Soon
                    </span>
                  )}
                </div>

                {/* Title & Description */}
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2 font-display flex items-center gap-2">
                  {android.name}
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white/10 text-slate-300 font-mono">APK</span>
                </h3>
                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                  Ultra-fast, private mobile browsing engineered for Android smartphones and tablets. Zero trackers, ad-blocking by default, and continuous security.
                </p>

                {/* Technical Specifications List */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-black/40 p-4 rounded-xl border border-white/[0.06] text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5 text-[11px]">Supported OS</span>
                    <span className="font-semibold text-slate-200">{android.osTarget}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5 text-[11px]">Architecture</span>
                    <span className="font-semibold text-slate-200">Universal APK</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5 text-[11px]">Package Format</span>
                    <span className="font-mono text-emerald-400 font-medium">{android.installerFormat}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5 text-[11px]">Release / Size</span>
                    <span className="font-mono text-slate-300">{androidVersion} {androidSize ? `(${androidSize})` : ''}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: CTA & Notification */}
              <div className="lg:col-span-5 flex flex-col justify-center">
                {androidAvailable ? (
                  <MagneticButton strength={0.15} className="w-full">
                    <a
                      href={androidDownloadUrl!}
                      download
                      onClick={(e) => handleDownloadClick(e, android, androidDownloadUrl)}
                      className="w-full relative group/btn rounded-2xl p-[1px] font-semibold text-white shadow-xl shadow-emerald-500/20 block text-center"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-400 to-kivo-cyan rounded-2xl animate-gradient-x opacity-95 group-hover/btn:opacity-100 transition-opacity" />
                      <div className="relative flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-kivo-blue text-base font-bold text-white">
                        <Download className="w-5 h-5 text-white" />
                        <span>Download for Android (.apk)</span>
                      </div>
                    </a>
                  </MagneticButton>
                ) : (
                  <div className="space-y-3">
                    <MagneticButton strength={0.12} className="w-full">
                      <button
                        type="button"
                        onClick={(e) => handleDownloadClick(e, android)}
                        className="w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-white border border-emerald-500/30 hover:border-emerald-400/50 text-base font-semibold transition-all group/btn shadow-lg shadow-emerald-500/5"
                      >
                        <Bell className="w-5 h-5 text-emerald-400 group-hover/btn:scale-110 transition-transform" />
                        <span>Get Android Release Notification</span>
                      </button>
                    </MagneticButton>
                    <p className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>Direct APK binary coming soon. Final build validation in progress.</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* 2 & 3. Windows and macOS Download Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Windows Download Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="group relative rounded-3xl bg-gradient-to-b from-[#0E1528]/90 to-[#070B14]/95 border border-white/[0.1] hover:border-kivo-blue/40 p-8 sm:p-10 backdrop-blur-2xl shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-glow-blue flex flex-col justify-between"
          >
            <div>
              {/* Card Header: Platform Icon + Status */}
              <div className="flex items-center justify-between mb-8">
                <div className="w-14 h-14 rounded-2xl bg-kivo-blue/15 border border-kivo-blue/30 flex items-center justify-center text-kivo-cyan shadow-sm">
                  <WindowsIcon className="w-7 h-7" />
                </div>
                {winAvailable ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs font-semibold text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Available Now
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-xs font-semibold text-amber-300">
                    <Clock className="w-3.5 h-3.5 text-amber-300" />
                    Coming Soon
                  </span>
                )}
              </div>

              {/* Title & Specs */}
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2 font-display">
                {windows.name}
              </h3>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                Native build optimized for Windows desktop workstations and laptops.
              </p>

              {/* Technical Specifications List */}
              <div className="space-y-3 mb-8 bg-black/30 p-4 rounded-xl border border-white/[0.05]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Supported OS:</span>
                  <span className="font-semibold text-slate-200">{windows.osTarget}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Architecture:</span>
                  <span className="font-semibold text-slate-200">{windows.architecture}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Package Format:</span>
                  <span className="font-mono text-kivo-cyan font-medium">{windows.installerFormat}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Release Version:</span>
                  <span className="font-mono text-slate-300">{winVersion}</span>
                </div>
                {winSize && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Installer Size:</span>
                    <span className="font-mono text-slate-300">{winSize}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Download CTA Button */}
            <div>
              {winAvailable ? (
                <MagneticButton strength={0.15} className="w-full">
                  <a
                    href={winDownloadUrl!}
                    download
                    onClick={(e) => handleDownloadClick(e, windows, winDownloadUrl)}
                    className="w-full relative group/btn rounded-2xl p-[1px] font-semibold text-white shadow-xl shadow-kivo-blue/20 block text-center"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-kivo-blue via-kivo-cyan to-kivo-purple rounded-2xl animate-gradient-x opacity-95 group-hover/btn:opacity-100 transition-opacity" />
                    <div className="relative flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-gradient-to-r from-kivo-blue to-kivo-purple text-base font-bold text-white">
                      <Download className="w-5 h-5 text-white" />
                      <span>Download for Windows (.exe)</span>
                    </div>
                  </a>
                </MagneticButton>
              ) : (
                <div className="space-y-3">
                  <MagneticButton strength={0.12} className="w-full">
                    <button
                      type="button"
                      onClick={(e) => handleDownloadClick(e, windows)}
                      className="w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.12] hover:border-kivo-cyan/30 text-base font-semibold transition-all group/btn"
                    >
                      <Bell className="w-5 h-5 text-kivo-cyan group-hover/btn:scale-110 transition-transform" />
                      <span>Get Windows Release Notification</span>
                    </button>
                  </MagneticButton>
                  <p className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>Direct installer binary coming soon. Final build validation in progress.</span>
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          {/* macOS Download Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="group relative rounded-3xl bg-gradient-to-b from-[#0E1528]/90 to-[#070B14]/95 border border-white/[0.1] hover:border-kivo-purple/40 p-8 sm:p-10 backdrop-blur-2xl shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-glow-purple flex flex-col justify-between"
          >
            <div>
              {/* Card Header: Platform Icon + Status */}
              <div className="flex items-center justify-between mb-8">
                <div className="w-14 h-14 rounded-2xl bg-kivo-purple/15 border border-kivo-purple/30 flex items-center justify-center text-slate-200 shadow-sm">
                  <AppleIcon className="w-7 h-7" />
                </div>
                {macAvailable || macArmAvailable || macIntelAvailable ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs font-semibold text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Available Now
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-xs font-semibold text-amber-300">
                    <Clock className="w-3.5 h-3.5 text-amber-300" />
                    Coming Soon
                  </span>
                )}
              </div>

              {/* Title & Specs */}
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2 font-display">
                {macos.name}
              </h3>
              <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                Native build for macOS, supporting Apple Silicon and Intel machines.
              </p>

              {/* Architecture Selector Chips */}
              <div className="mb-6 flex items-center gap-2 p-1.5 rounded-xl bg-black/40 border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setSelectedMacArch('arm64')}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                    selectedMacArch === 'arm64'
                      ? 'bg-kivo-purple/20 text-white border border-kivo-purple/40 shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5 text-kivo-purple" />
                  <span>Apple Silicon (M1/M2/M3/M4)</span>
                  {macArmAvailable && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMacArch('intel')}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                    selectedMacArch === 'intel'
                      ? 'bg-white/10 text-white border border-white/20 shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Intel (x64)</span>
                  {macIntelAvailable && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </button>
              </div>

              {/* Technical Specifications List */}
              <div className="space-y-3 mb-8 bg-black/30 p-4 rounded-xl border border-white/[0.05]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Supported OS:</span>
                  <span className="font-semibold text-slate-200">{macos.osTarget}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Architecture:</span>
                  <span className="font-semibold text-slate-200">
                    {selectedMacArch === 'arm64' ? 'Apple Silicon (ARM64)' : 'Intel 64-bit (x64)'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Package Format:</span>
                  <span className="font-mono text-kivo-purple font-medium">{macos.installerFormat}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Release Version:</span>
                  <span className="font-mono text-slate-300">{macVersion}</span>
                </div>
                {macSize && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Installer Size:</span>
                    <span className="font-mono text-slate-300">{macSize}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Download CTA Button */}
            <div>
              {macAvailable ? (
                <MagneticButton strength={0.15} className="w-full">
                  <a
                    href={macDownloadUrl!}
                    download
                    onClick={(e) => handleDownloadClick(e, macos, macDownloadUrl)}
                    className="w-full relative group/btn rounded-2xl p-[1px] font-semibold text-white shadow-xl shadow-kivo-purple/20 block text-center"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-kivo-blue via-kivo-cyan to-kivo-purple rounded-2xl animate-gradient-x opacity-95 group-hover/btn:opacity-100 transition-opacity" />
                    <div className="relative flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-gradient-to-r from-kivo-blue to-kivo-purple text-base font-bold text-white">
                      <Download className="w-5 h-5 text-white" />
                      <span>Download for macOS {selectedMacArch === 'arm64' ? '(Apple Silicon)' : '(Intel)'}</span>
                    </div>
                  </a>
                </MagneticButton>
              ) : (
                <div className="space-y-3">
                  <MagneticButton strength={0.12} className="w-full">
                    <button
                      type="button"
                      onClick={(e) => handleDownloadClick(e, macos)}
                      className="w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.12] hover:border-kivo-purple/30 text-base font-semibold transition-all group/btn"
                    >
                      <Bell className="w-5 h-5 text-kivo-purple group-hover/btn:scale-110 transition-transform" />
                      <span>Get macOS {selectedMacArch === 'arm64' ? 'ARM' : 'Intel'} Notification</span>
                    </button>
                  </MagneticButton>
                  <p className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>Direct installer binary coming soon. Final build validation in progress.</span>
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Transparent Release Integrity Notice */}
        <div className="mt-12 text-center max-w-2xl mx-auto p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-400">
          <div className="flex items-center justify-center gap-2 mb-2 text-slate-300 font-mono text-[11px]">
            <span>Latest Planned Release: {latestVersion}</span>
            <span>•</span>
            <span>Target: {releaseDate}</span>
          </div>
          <p>
            <strong className="text-slate-300 font-semibold">Integrity Commitment:</strong> KIVO downloads are verified binaries directly signed for production. We do not distribute bundles with unwanted sponsored third-party tools or adware.
          </p>
        </div>
      </div>
    </section>
  );
};
