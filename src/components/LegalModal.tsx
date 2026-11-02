import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, FileText } from 'lucide-react';
import logoImg from '../assets/kivo-logo.png';

interface LegalModalProps {
  isOpen: boolean;
  initialTab?: 'privacy' | 'terms';
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  initialTab = 'privacy',
  onClose,
}) => {
  const [tab, setTab] = React.useState<'privacy' | 'terms'>(initialTab);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-3xl rounded-3xl bg-[#090D18] border border-white/[0.12] shadow-2xl p-6 sm:p-8 z-10 max-h-[88vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-5 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <img src={logoImg} alt="KIVO" className="w-8 h-8 object-contain" />
              <div>
                <h3 className="text-lg font-bold text-white font-display">
                  KIVO Legal & Compliance
                </h3>
                <p className="text-xs text-slate-400">
                  Updated for 2026 Desktop Releases
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              type="button"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-2 pt-4 pb-2">
            <button
              type="button"
              onClick={() => setTab('privacy')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                tab === 'privacy'
                  ? 'bg-kivo-blue text-white shadow-sm'
                  : 'bg-white/[0.04] text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Privacy Policy</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('terms')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                tab === 'terms'
                  ? 'bg-kivo-purple text-white shadow-sm'
                  : 'bg-white/[0.04] text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Terms of Service</span>
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="overflow-y-auto pr-2 mt-4 space-y-5 text-xs sm:text-sm text-slate-300 leading-relaxed max-h-[55vh]">
            {tab === 'privacy' ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-base font-bold text-white mb-1.5 font-display">
                    1. Our Core Principle: Zero Behavioral Surveillance
                  </h4>
                  <p className="text-slate-400">
                    KIVO is architected with a strict privacy-first foundation. We do not track, profile, monetize, or harvest your browsing history, typed queries, downloaded files, or session activities.
                  </p>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white mb-1.5 font-display">
                    2. Local Data Storage & Credentials
                  </h4>
                  <p className="text-slate-400">
                    All browser configuration data, bookmarks, local saved passwords, and browsing profiles are stored locally on your desktop machine in your user directory. KIVO does not upload your sensitive credentials to remote cloud repositories without your active explicit configuration.
                  </p>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white mb-1.5 font-display">
                    3. Network Filtering & Shields
                  </h4>
                  <p className="text-slate-400">
                    The KIVO Shield engine processes network filters client-side on your desktop CPU. Match rules are checked locally without sending the list of visited URLs to external inspection servers.
                  </p>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white mb-1.5 font-display">
                    4. Crash Reporting and Software Updates
                  </h4>
                  <p className="text-slate-400">
                    When checking for software updates, KIVO transmits only your browser version and OS platform architecture to verify whether an update binary exists. No personally identifiable tracking ID is appended.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="text-base font-bold text-white mb-1.5 font-display">
                    1. Acceptance of Terms
                  </h4>
                  <p className="text-slate-400">
                    By downloading, installing, or using the KIVO Browser application or accessing this website, you agree to these Terms of Service.
                  </p>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white mb-1.5 font-display">
                    2. Permitted Use
                  </h4>
                  <p className="text-slate-400">
                    KIVO is provided for personal and professional web browsing on supported Windows and macOS desktop operating systems. You may not reverse engineer, tamper with security integrity mechanisms, or re-distribute compromised binaries disguised under the KIVO trademark.
                  </p>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white mb-1.5 font-display">
                    3. Disclaimer of Warranties
                  </h4>
                  <p className="text-slate-400">
                    KIVO Browser and its accompanying software releases are provided &ldquo;as is&rdquo; without warranties of any kind, either express or implied. While we strive for optimal stability, safety, and security, you use the software at your discretion.
                  </p>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white mb-1.5 font-display">
                    4. Copyright and Trademark
                  </h4>
                  <p className="text-slate-400">
                    &ldquo;KIVO&rdquo;, the KIVO logo, and associated visual design elements are proprietary trademarks. All other trademarks, platform logos (Windows, Apple), and third-party references remain the property of their respective owners.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="pt-4 mt-4 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-500">
            <span>Effective date: 2026</span>
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-1.5 rounded-lg bg-white/[0.08] text-white hover:bg-white/[0.12] transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
