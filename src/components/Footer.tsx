import React from 'react';
import { Shield, Cookie, Award, ShieldAlert, Sliders } from 'lucide-react';
import logoImg from '../assets/kivo-logo.png';
import { WindowsIcon, AppleIcon, AndroidIcon } from './Hero';
import { useCms } from '../context/CmsContext';
import type { LegalTab } from './LegalModal';

interface FooterProps {
  onOpenLegal: (tab: LegalTab) => void;
  onOpenSupport?: () => void;
  onOpenCookiePreferences?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenLegal,
  onOpenSupport,
  onOpenCookiePreferences,
}) => {
  const { content } = useCms();
  const footer = content.footer;

  const scrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.querySelector(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="relative bg-[#04060A] text-slate-400 border-t border-white/[0.08] overflow-hidden">
      {/* Subtle top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-kivo-blue/40 to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-32 bg-kivo-blue/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-white/[0.06]">
          {/* Brand Info */}
          <div className="lg:col-span-5 space-y-4">
            <a
              href="#home"
              onClick={(e) => scrollTo(e, '#home')}
              className="inline-flex items-center gap-3 group"
            >
              <div className="relative w-10 h-10 flex-shrink-0">
                <img
                  src={logoImg}
                  alt="KIVO Original Logo"
                  className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold tracking-tight text-white font-display">
                  KIVO
                </span>
                <span className="text-xs text-kivo-cyan font-medium -mt-1">
                  Browse Freely.
                </span>
              </div>
            </a>

            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              {footer?.tagline || 'A modern privacy-first desktop and mobile web browser engineered for Android, Windows, and macOS. Fast, sovereign, and deeply customizable.'}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <span className="badge-3d inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.1] text-xs text-slate-300 shadow-sm">
                <AndroidIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>Android 10+</span>
              </span>
              <span className="badge-3d inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.1] text-xs text-slate-300 shadow-sm">
                <WindowsIcon className="w-3.5 h-3.5 text-kivo-cyan" />
                <span>Windows 10 / 11</span>
              </span>
              <span className="badge-3d inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.1] text-xs text-slate-300 shadow-sm">
                <AppleIcon className="w-3.5 h-3.5 text-slate-200" />
                <span>macOS Universal</span>
              </span>
            </div>
          </div>

          {/* Quick Navigation Links */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-4">
              Navigation
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href="#home"
                  onClick={(e) => scrollTo(e, '#home')}
                  className="hover:text-white transition-colors"
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="#about-ceo"
                  onClick={(e) => scrollTo(e, '#about-ceo')}
                  className="hover:text-white transition-colors"
                >
                  About the CEO
                </a>
              </li>
              <li>
                <a
                  href="#features"
                  onClick={(e) => scrollTo(e, '#features')}
                  className="hover:text-white transition-colors"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#privacy"
                  onClick={(e) => scrollTo(e, '#privacy')}
                  className="hover:text-white transition-colors"
                >
                  Privacy Protection
                </a>
              </li>
              <li>
                <a
                  href="#showcase"
                  onClick={(e) => scrollTo(e, '#showcase')}
                  className="hover:text-white transition-colors"
                >
                  Browser Showcase
                </a>
              </li>
              <li>
                <a
                  href="#about"
                  onClick={(e) => scrollTo(e, '#about')}
                  className="hover:text-white transition-colors"
                >
                  About KIVO
                </a>
              </li>
              <li>
                <a
                  href="#download"
                  onClick={(e) => scrollTo(e, '#download')}
                  className="text-kivo-cyan hover:text-white font-medium transition-colors"
                >
                  Download Releases
                </a>
              </li>
            </ul>
          </div>

          {/* Legal, Cookies and Trust Information */}
          <div className="lg:col-span-4 space-y-3">
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-4">
              Legal, Security & Compliance
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegal('privacy')}
                  className="hover:text-white transition-colors text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegal('terms')}
                  className="hover:text-white transition-colors text-left"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegal('cookies')}
                  className="hover:text-white transition-colors text-left flex items-center gap-1.5"
                >
                  <Cookie className="w-3.5 h-3.5 text-amber-400" />
                  <span>Cookie Policy</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegal('license')}
                  className="hover:text-white transition-colors text-left flex items-center gap-1.5"
                >
                  <Award className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Software License &amp; EULA</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegal('security')}
                  className="hover:text-white transition-colors text-left flex items-center gap-1.5"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>Security &amp; Vulnerability Disclosure</span>
                </button>
              </li>
              {onOpenCookiePreferences && (
                <li>
                  <button
                    type="button"
                    onClick={onOpenCookiePreferences}
                    className="text-slate-300 hover:text-white transition-colors text-left flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08]"
                  >
                    <Sliders className="w-3 h-3 text-kivo-cyan" />
                    <span>Cookie Preferences / Settings</span>
                  </button>
                </li>
              )}
              {onOpenSupport && (
                <li>
                  <button
                    type="button"
                    onClick={onOpenSupport}
                    className="text-kivo-cyan hover:text-white transition-colors text-left font-medium"
                  >
                    Contact &amp; Support (Report Problem)
                  </button>
                </li>
              )}
              <li className="pt-2">
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs text-slate-400">
                  <div className="flex items-center gap-1.5 text-white font-medium mb-1">
                    <Shield className="w-3.5 h-3.5 text-kivo-cyan" />
                    <span>Zero Third-Party Ad Networks</span>
                  </div>
                  KIVO does not sell your browsing profiles or monetize personal data streams.
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>{footer?.copyright || '© 2026 KIVO Browser Technologies & Shaurya Sharma. All rights reserved.'}</p>
          <div className="flex items-center gap-6">
            <span className="font-medium text-slate-400">
              KIVO — Browse Freely.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
