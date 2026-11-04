import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, AlertTriangle, AlertOctagon, Wrench, X, ArrowRight } from 'lucide-react';
import { useCms } from '../context/CmsContext';

export const AnnouncementBanner: React.FC = () => {
  const { content } = useCms();
  const announcement = content.announcement;
  const [dismissed, setDismissed] = useState(false);

  if (!announcement || !announcement.isEnabled || dismissed) {
    return null;
  }

  const typeConfig = {
    info: {
      bg: 'bg-kivo-blue/15 border-kivo-blue/40 text-kivo-cyan',
      icon: <Info className="w-4 h-4 text-kivo-cyan shrink-0" />,
      btn: 'bg-kivo-blue text-white hover:bg-kivo-cyan hover:text-black',
    },
    warning: {
      bg: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
      icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
      btn: 'bg-amber-500 text-black hover:bg-amber-400',
    },
    alert: {
      bg: 'bg-rose-500/15 border-rose-500/40 text-rose-300',
      icon: <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />,
      btn: 'bg-rose-500 text-white hover:bg-rose-600',
    },
    maintenance: {
      bg: 'bg-kivo-purple/15 border-kivo-purple/40 text-purple-300',
      icon: <Wrench className="w-4 h-4 text-kivo-purple shrink-0" />,
      btn: 'bg-kivo-purple text-white hover:bg-purple-500',
    },
  }[announcement.type || 'info'];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className={`relative z-40 border-b backdrop-blur-md px-4 py-2.5 text-xs font-medium ${typeConfig.bg}`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {typeConfig.icon}
            <span className="truncate">{announcement.message}</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {announcement.actionText && announcement.actionLink && (
              <a
                href={announcement.actionLink}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-200 ${typeConfig.btn}`}
              >
                <span>{announcement.actionText}</span>
                <ArrowRight className="w-3 h-3" />
              </a>
            )}

            {announcement.dismissible && (
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                aria-label="Dismiss banner"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
