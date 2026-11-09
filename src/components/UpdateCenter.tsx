import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ShieldCheck,
  Zap,
  Bug,
  Cpu,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import logoImg from '../assets/kivo-logo.png';
import { WindowsIcon, AppleIcon } from './Hero';

interface ReleaseItem {
  version: string;
  releaseDate: string;
  isLatest: boolean;
  whatsNew: string[];
  bugFixes: string[];
  securityImprovements: string[];
  systemRequirements?: {
    windows?: string;
    macos?: string;
  };
  downloads?: {
    windows?: { platform: string; fileName: string; downloadUrl: string };
    macArm?: { platform: string; fileName: string; downloadUrl: string };
    macIntel?: { platform: string; fileName: string; downloadUrl: string };
  };
}

interface UpdateCenterProps {
  onNavigateHome: () => void;
}

export const UpdateCenter: React.FC<UpdateCenterProps> = ({ onNavigateHome }) => {
  const [releases, setReleases] = useState<ReleaseItem[]>([]);
  const [latestRelease, setLatestRelease] = useState<ReleaseItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/updates')
      .then((res) => res.json())
      .then((data) => {
        if (data.releases) {
          setReleases(data.releases);
          setLatestRelease(data.latest || data.releases[0]);
        }
      })
      .catch((err) => console.error('Error loading updates:', err))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-kivo-bg text-slate-100 flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="border-b border-white/[0.08] bg-kivo-bg/80 backdrop-blur-xl sticky top-0 z-40 py-4 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onNavigateHome}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white transition-colors"
              title="Return to Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2.5">
              <img src={logoImg} alt="KIVO" className="w-8 h-8 object-contain" />
              <div>
                <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5 font-display">
                  KIVO Update Center
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-kivo-cyan/15 text-kivo-cyan border border-kivo-cyan/30">
                    Official Releases
                  </span>
                </h1>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateHome}
            className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Back to Website
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 flex-1 w-full">
        {isLoading && (
          <div className="py-20 text-center text-xs text-slate-400">
            Loading releases and architecture notes...
          </div>
        )}

        {/* Banner Section */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] mb-4 text-xs font-medium text-kivo-cyan"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>KIVO Release Notes & Architecture Evolution</span>
          </motion.div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
            Browser Release Notes & Version History
          </h2>
          <p className="mt-3 text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Stay up to date with the latest performance enhancements, security patches, intelligent workspace tools, and zero-telemetry engine upgrades.
          </p>
        </div>

        {/* Latest Release Spotlight Card */}
        {latestRelease && (
          <div className="mb-14 rounded-3xl bg-gradient-to-b from-[#0D152A] to-[#070B16] border border-kivo-cyan/30 p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-kivo-cyan/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl sm:text-3xl font-extrabold text-white font-display">
                    KIVO Browser v{latestRelease.version}
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Latest Stable Release
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-2 font-mono">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    Released on {latestRelease.releaseDate}
                  </span>
                  <span>•</span>
                  <span>Production Channel</span>
                </div>
              </div>

              {/* Download Buttons for Current Release */}
              <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
                <a
                  href="/api/download/windows"
                  className="px-4 py-2 rounded-xl bg-kivo-blue hover:bg-kivo-blue/90 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-kivo-blue/20"
                >
                  <WindowsIcon className="w-4 h-4" />
                  <span>Windows (.exe)</span>
                </a>
                <a
                  href="/api/download/mac-arm64"
                  className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs font-semibold flex items-center gap-2 transition-colors border border-white/10"
                >
                  <AppleIcon className="w-4 h-4" />
                  <span>Apple Silicon</span>
                </a>
                <a
                  href="/api/download/mac-intel"
                  className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs font-semibold flex items-center gap-2 transition-colors border border-white/10"
                >
                  <AppleIcon className="w-4 h-4" />
                  <span>Mac Intel</span>
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
              {/* What's New */}
              <div>
                <h4 className="text-xs font-bold text-kivo-cyan uppercase tracking-wider flex items-center gap-1.5 mb-3">
                  <Zap className="w-4 h-4" />
                  What’s New
                </h4>
                <ul className="space-y-2">
                  {latestRelease.whatsNew.map((item, idx) => (
                    <li key={idx} className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-kivo-cyan mt-1.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bug Fixes */}
              <div>
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                  <Bug className="w-4 h-4" />
                  Bug Fixes
                </h4>
                <ul className="space-y-2">
                  {latestRelease.bugFixes.map((item, idx) => (
                    <li key={idx} className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Security Improvements */}
              <div>
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                  <ShieldCheck className="w-4 h-4" />
                  Security Improvements
                </h4>
                <ul className="space-y-2">
                  {latestRelease.securityImprovements.map((item, idx) => (
                    <li key={idx} className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* System Requirements Footnote */}
            {latestRelease.systemRequirements && (
              <div className="mt-6 pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    <strong>Requirements:</strong> Windows 10/11 x64 (4 GB RAM) | macOS Monterey 12.0+ (ARM64 & Intel)
                  </span>
                </div>
                <span className="text-slate-500">All downloads SHA-256 verified</span>
              </div>
            )}
          </div>
        )}

        {/* Complete Release History Log */}
        <div>
          <h3 className="text-xl font-bold text-white font-display mb-6">
            Release History & Changelog
          </h3>

          <div className="space-y-6">
            {releases.map((rel) => (
              <div
                key={rel.version}
                className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.15] transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-white font-display">
                      Version {rel.version}
                    </span>
                    {rel.isLatest && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Current
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-slate-400">{rel.releaseDate}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Key Updates:
                    </span>
                    <ul className="space-y-1">
                      {rel.whatsNew.slice(0, 3).map((n, i) => (
                        <li key={i} className="text-slate-300 flex items-start gap-1.5">
                          <span className="text-kivo-cyan">•</span>
                          <span>{n}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Fixes & Hardening:
                    </span>
                    <ul className="space-y-1">
                      {rel.bugFixes.concat(rel.securityImprovements).slice(0, 3).map((f, i) => (
                        <li key={i} className="text-slate-300 flex items-start gap-1.5">
                          <span className="text-emerald-400">•</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer Note */}
      <footer className="border-t border-white/[0.08] py-8 text-center text-xs text-slate-500">
        <p>KIVO Browser • Safe, isolated desktop browsing.</p>
      </footer>
    </div>
  );
};
