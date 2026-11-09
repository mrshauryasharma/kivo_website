import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ExternalLink, GraduationCap } from 'lucide-react';
import { LinkedInIcon, GitHubIcon } from './SocialIcons';
import logoImg from '../assets/kivo-logo.png';
import { useCms } from '../context/CmsContext';

export const CeoBottomSection: React.FC = () => {
  const { content } = useCms();
  const ceo = content.ceo;

  if (ceo && ceo.isVisible === false) {
    return null;
  }

  const monogram = (ceo?.name || 'Shaurya Sharma')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'SS';

  return (
    <section id="meet-ceo" className="py-16 sm:py-20 relative overflow-hidden bg-[#050810] border-t border-white/[0.06]">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-40 bg-gradient-to-r from-kivo-blue/10 via-kivo-cyan/10 to-kivo-purple/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl bg-gradient-to-r from-[#0C1324]/90 via-[#090E1B]/95 to-[#0F1024]/90 border border-white/[0.1] hover:border-white/[0.15] p-6 sm:p-8 backdrop-blur-2xl shadow-xl transition-all duration-300 relative overflow-hidden"
        >
          {/* Subtle accent border line */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-kivo-blue via-kivo-cyan to-kivo-purple opacity-70" />

          <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8 justify-between">
            {/* Left: Avatar emblem + Title + Info */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5 flex-1">
              {/* Executive SS Monogram */}
              <div className="relative flex-shrink-0">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-kivo-blue via-kivo-cyan to-kivo-purple opacity-75 blur-sm" />
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#090D1A] border border-white/[0.15] flex items-center justify-center shadow-lg">
                  <span className="text-2xl sm:text-3xl font-extrabold font-display text-gradient-kivo">
                    {monogram}
                  </span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-[#090D1A] border border-white/[0.15] p-1 flex items-center justify-center shadow-md">
                  <img src={logoImg} alt="KIVO" className="w-full h-full object-contain" />
                </div>
              </div>

              {/* Bio & Credentials */}
              <div className="space-y-1.5 max-w-xl">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-semibold text-kivo-cyan">
                    <Sparkles className="w-3 h-3 text-kivo-cyan" />
                    Meet Our CEO & Co-Founder
                  </span>
                  {ceo?.education && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                      <GraduationCap className="w-3 h-3 text-slate-400" />
                      {ceo.education}
                    </span>
                  )}
                </div>

                <h3 className="text-xl sm:text-2xl font-extrabold text-white font-display">
                  {ceo?.name || 'Shaurya Sharma'}
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-gradient-kivo">
                  {ceo?.designation || 'CEO & Co-Founder – KIVO Browser'}
                </p>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal pt-1">
                  {ceo?.bio || 'Leading the architecture, IoT integration, and frontend engineering of KIVO Browser to deliver a sovereign, fast, and beautifully customizable desktop browsing experience.'}
                </p>
              </div>
            </div>

            {/* Right: Quick Social Connect Buttons */}
            <div className="flex sm:flex-col items-center gap-3 w-full sm:w-auto flex-shrink-0 pt-2 sm:pt-0">
              <a
                href={ceo?.social?.linkedin || 'https://www.linkedin.com/in/shaurya-sharma200'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] hover:border-[#0A66C2]/60 text-slate-200 hover:text-white text-xs font-semibold transition-all duration-200 shadow-sm"
              >
                <LinkedInIcon className="w-4 h-4 text-[#0A66C2]" />
                <span>LinkedIn</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </a>

              <a
                href={ceo?.social?.github || 'https://github.com/mrshauryasharma'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] hover:border-kivo-purple/60 text-slate-200 hover:text-white text-xs font-semibold transition-all duration-200 shadow-sm"
              >
                <GitHubIcon className="w-4 h-4 text-slate-200" />
                <span>GitHub</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
