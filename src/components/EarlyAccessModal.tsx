import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, CheckCircle2 } from 'lucide-react';
import { WindowsIcon, AppleIcon } from './Hero';

interface EarlyAccessModalProps {
  isOpen: boolean;
  platform: 'windows' | 'macos';
  onClose: () => void;
}

export const EarlyAccessModal: React.FC<EarlyAccessModalProps> = ({
  isOpen,
  platform,
  onClose,
}) => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleClose = useCallback(() => {
    setIsSubmitted(false);
    setEmail('');
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && email.includes('@')) {
      setIsSubmitted(true);
    }
  };

  const platformTitle = platform === 'windows' ? 'KIVO for Windows' : 'KIVO for macOS';
  const PlatformIcon = platform === 'windows' ? WindowsIcon : AppleIcon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-lg rounded-3xl bg-[#090D18] border border-white/[0.12] shadow-2xl p-6 sm:p-8 z-10 overflow-hidden"
        >
          {/* Ambient Corner Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-kivo-blue/20 blur-[80px] pointer-events-none" />

          {/* Close button */}
          <button
            onClick={handleClose}
            type="button"
            className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon & Title */}
          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-kivo-blue/20 to-kivo-purple/20 border border-white/[0.1] flex items-center justify-center text-white">
              <PlatformIcon className="w-6 h-6 text-kivo-cyan" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  Release Status: Coming Soon
                </span>
              </div>
              <h3 className="text-xl font-bold text-white font-display mt-1">
                {platformTitle}
              </h3>
            </div>
          </div>

          {!isSubmitted ? (
            <div>
              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                The desktop installer is currently undergoing final security checks and performance validation. Register below to be notified the moment the public binary drops.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="early-access-email" className="block text-xs font-semibold text-slate-300 mb-2">
                    Email address for release alert:
                  </label>
                  <input
                    id="early-access-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/[0.12] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-kivo-cyan focus:ring-1 focus:ring-kivo-cyan transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-kivo-blue via-kivo-cyan to-kivo-purple font-semibold text-white text-sm shadow-lg shadow-kivo-blue/25 hover:opacity-95 transition-all flex items-center justify-center gap-2"
                >
                  <Bell className="w-4 h-4" />
                  <span>Notify Me on Launch</span>
                </button>
              </form>

              <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-500">
                <span>No spam. Only release notifications.</span>
                <span className="font-mono">Expected: Q4 2026</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2 font-display">
                You are on the notification list!
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                We will email <span className="text-kivo-cyan font-mono">{email}</span> with direct download links and checksum hashes as soon as the official build goes live.
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-sm font-semibold text-white transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
