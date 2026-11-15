import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, Check, Sliders, ChevronDown, ChevronUp, Lock, Zap, SlidersHorizontal } from 'lucide-react';

export interface CookiePreferences {
  essential: boolean;
  performance: boolean;
  functional: boolean;
  timestamp: number;
}

interface CookieConsentBannerProps {
  isOpen?: boolean;
  onClose?: () => void;
  onOpenCookiePolicy: () => void;
}

const STORAGE_KEY = 'kivo_cookie_preferences';

export function getSavedCookiePreferences(): CookiePreferences | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveCookiePreferences(prefs: CookiePreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    // Also set a lightweight client-side cookie so requests indicate consent status
    const value = prefs.performance && prefs.functional ? 'all' : 'essential';
    const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `kivo_consent_status=${value}; path=/; expires=${expires}; SameSite=Lax`;
  } catch (e) {
    console.error('Failed to save cookie preferences', e);
  }
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({
  isOpen = false,
  onClose,
  onOpenCookiePolicy,
}) => {
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [performance, setPerformance] = useState(true);
  const [functional, setFunctional] = useState(true);

  useEffect(() => {
    // If explicitly opened via props (e.g. from Footer "Cookie Settings")
    if (isOpen) {
      const saved = getSavedCookiePreferences();
      if (saved) {
        setPerformance(saved.performance);
        setFunctional(saved.functional);
      }
      setShowCustomize(true);
      setVisible(true);
      return;
    }

    // Otherwise check if already decided
    const saved = getSavedCookiePreferences();
    if (!saved) {
      // Delay entrance slightly for smoother initial load
      const timer = setTimeout(() => {
        setVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleAcceptAll = () => {
    const prefs: CookiePreferences = {
      essential: true,
      performance: true,
      functional: true,
      timestamp: Date.now(),
    };
    saveCookiePreferences(prefs);
    setVisible(false);
    setShowCustomize(false);
    onClose?.();
  };

  const handleEssentialOnly = () => {
    const prefs: CookiePreferences = {
      essential: true,
      performance: false,
      functional: false,
      timestamp: Date.now(),
    };
    saveCookiePreferences(prefs);
    setVisible(false);
    setShowCustomize(false);
    onClose?.();
  };

  const handleSaveCustom = () => {
    const prefs: CookiePreferences = {
      essential: true,
      performance,
      functional,
      timestamp: Date.now(),
    };
    saveCookiePreferences(prefs);
    setVisible(false);
    setShowCustomize(false);
    onClose?.();
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <div className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6 pointer-events-none flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.98 }}
          transition={{ duration: 0.3 }}
          className="pointer-events-auto w-full max-w-4xl rounded-2xl bg-[#090D18]/95 border border-white/[0.12] shadow-2xl backdrop-blur-xl p-5 sm:p-6 text-slate-200"
        >
          {/* Main Banner Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-kivo-blue/15 border border-kivo-blue/30 flex items-center justify-center text-kivo-cyan flex-shrink-0">
                <Cookie className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white font-display flex items-center gap-2">
                  <span>Cookie & Privacy Sovereignty</span>
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    Zero Ad Trackers
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Strictly essential security & session cookies. We never sell, profile, or monetize your digital footprint.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenCookiePolicy}
              className="text-xs text-kivo-cyan hover:text-white underline underline-offset-4 transition-colors flex-shrink-0"
            >
              Read Cookie Policy →
            </button>
          </div>

          {/* Description & Expandable Customize Area */}
          <div className="py-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <p className="text-slate-400">
              KIVO operates with a privacy-by-default architecture. Essential cookies are required to deliver secure sessions, CSRF tamper protection, and verified installer downloads. You may selectively customize performance and UI preferences below.
            </p>

            {/* Toggleable Customization Panel */}
            <AnimatePresence>
              {showCustomize && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden mt-4 pt-4 border-t border-white/[0.06] space-y-3"
                >
                  {/* Category 1: Essential */}
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-semibold text-white">Strictly Necessary & Security Cookies</span>
                          <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded bg-white/[0.08] text-slate-300">Always Active</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Protects against CSRF attacks, keeps administrative sessions encrypted, and maintains download integrity.
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="text-xs text-emerald-400 font-semibold px-2 py-1 rounded bg-emerald-400/10 border border-emerald-400/20">
                        Required
                      </span>
                    </div>
                  </div>

                  {/* Category 2: Performance & Caching */}
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-kivo-blue/10 text-kivo-cyan mt-0.5">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs sm:text-sm font-semibold text-white">Performance & Local Cache</span>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Enables Service Worker offline asset acceleration, instantaneous page switching, and local speed analytics.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={performance}
                      onClick={() => setPerformance(!performance)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        performance ? 'bg-kivo-blue' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          performance ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Category 3: Functional / Preferences */}
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-kivo-purple/10 text-kivo-purple mt-0.5">
                        <SlidersHorizontal className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs sm:text-sm font-semibold text-white">Functional UI Preferences</span>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Remembers custom mouse cursor states, audio settings, and dismissals for notification banners.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={functional}
                      onClick={() => setFunctional(!functional)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        functional ? 'bg-kivo-purple' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          functional ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={() => setShowCustomize(!showCustomize)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{showCustomize ? 'Hide Preferences' : 'Customize Preferences'}</span>
              {showCustomize ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={handleEssentialOnly}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-colors"
              >
                Essential Only
              </button>

              {showCustomize ? (
                <button
                  type="button"
                  onClick={handleSaveCustom}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-kivo-blue to-kivo-purple text-xs sm:text-sm font-semibold text-white shadow-lg shadow-kivo-blue/20 hover:opacity-95 transition-all"
                >
                  Save Choices
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-kivo-blue hover:bg-kivo-blue/90 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-kivo-blue/20 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Accept All</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
