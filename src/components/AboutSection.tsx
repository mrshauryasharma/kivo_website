import React from 'react';
import { motion } from 'framer-motion';
import {
  Cpu,
  ShieldCheck,
  Palette,
  Sparkles,
  Heart,
} from 'lucide-react';
import logoImg from '../assets/kivo-logo.png';
import { useCms } from '../context/CmsContext';

export const AboutSection: React.FC = () => {
  const { content } = useCms();
  const about = content.about;
  const pillars = [
    {
      icon: Cpu,
      title: 'Modern Technology',
      badge: 'Speed & Architecture',
      color: 'blue',
      description:
        'Built with a modern desktop architecture designed for fast page rendering, lightweight memory consumption, and prompt startup times.',
    },
    {
      icon: ShieldCheck,
      title: 'Privacy-Focused Experience',
      badge: 'Zero Surveillance',
      color: 'cyan',
      description:
        'Engineered from day one without surveillance telemetry or user data collection. Your browsing sessions and site preferences stay on your machine.',
    },
    {
      icon: Palette,
      title: 'Deep Customization',
      badge: 'Your Aesthetic',
      color: 'purple',
      description:
        'Your browser should feel like your own workspace. Tailor backgrounds, theme palettes, typography, and speed dial shortcuts to match your workflow.',
    },
    {
      icon: Heart,
      title: 'User-Friendly Interface',
      badge: 'Intuitive Simplicity',
      color: 'blue',
      description:
        'Carefully refined ergonomics: no intrusive banners, no unwanted feed widgets, and no sponsored clutter. Just clean, distraction-free browsing.',
    },
  ];

  return (
    <section id="about" className="py-24 sm:py-32 relative overflow-hidden bg-kivo-bg">
      {/* Background glow effects */}
      <div className="absolute top-1/2 right-10 w-96 h-96 bg-kivo-blue/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-kivo-purple/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-semibold text-kivo-cyan mb-4"
          >
            <Sparkles className="w-3.5 h-3.5 text-kivo-cyan" />
            <span>The Story Behind KIVO</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-display mb-6"
          >
            {about?.heading || (
              <>
                Meet{' '}
                <span className="text-gradient-kivo">
                  KIVO.
                </span>
              </>
            )}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-base sm:text-xl text-slate-300 leading-relaxed font-normal max-w-2xl mx-auto"
          >
            {about?.missionText || 'KIVO is built around a simple idea: browsing should be fast, private, beautiful, and yours to customize.'}
          </motion.p>
        </div>

        {/* Narrative Feature Card with Logo & Mission (3D Depth) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-16 max-w-5xl mx-auto perspective-1000">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-5 flex flex-col items-center justify-center p-8 rounded-3xl card-3d preserve-3d bg-gradient-to-b from-[#0F1628]/95 to-[#070B14]/98 border border-white/[0.14] text-center relative overflow-hidden shadow-2xl"
          >
            <div className="absolute inset-0 bg-radial-glow opacity-30 pointer-events-none" />
            <div className="relative w-28 h-28 sm:w-36 sm:h-36 mb-6 translate-z-8">
              <div className="absolute inset-0 bg-gradient-to-tr from-kivo-blue/40 via-kivo-cyan/30 to-kivo-purple/40 blur-2xl rounded-full" />
              <img
                src={logoImg}
                alt="KIVO Original Logo"
                className="w-full h-full object-contain relative z-10 drop-shadow-[0_10px_20px_rgba(0,217,245,0.3)]"
              />
            </div>
            <h3 className="text-2xl font-bold text-white font-display mb-1 translate-z-4">
              KIVO Browser
            </h3>
            <p className="text-xs sm:text-sm text-kivo-cyan font-medium mb-4 translate-z-2">
              Browse Freely.
            </p>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed translate-z-2">
              Designed with precision for modern desktops across Windows, macOS and mobile devices.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-7 space-y-4"
          >
            <div className="p-6 rounded-2xl card-3d preserve-3d bg-white/[0.04] border border-white/[0.1] shadow-lg">
              <h4 className="text-base sm:text-lg font-bold text-white mb-2 font-display">
                {about?.missionTitle || 'Reclaiming the Modern Web'}
              </h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                {about?.paragraph1 || 'For years, desktop browsers have grown heavier, cluttered with unwanted news feeds, shopping popups, and aggressive advertising trackers that slow down your computer and track your habits across websites.'}
              </p>
            </div>

            <div className="p-6 rounded-2xl card-3d preserve-3d bg-white/[0.04] border border-white/[0.1] shadow-lg">
              <h4 className="text-base sm:text-lg font-bold text-white mb-2 font-display">
                {about?.visionTitle || 'Purely Desktop First'}
              </h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                {about?.paragraph2 || 'KIVO reimagines the browser as a calm, sovereign sanctuary. We strip away the unnecessary noise and give you genuine speed, uncompromising privacy, and a gorgeous user interface that you can truly make your own.'}
              </p>
            </div>
          </motion.div>
        </div>

        {/* 4 Pillars Grid (3D Depth) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 perspective-1000">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            const iconBorder = {
              blue: 'bg-kivo-blue/20 text-kivo-blue border-kivo-blue/40 shadow-[0_4px_12px_rgba(8,123,255,0.25)]',
              cyan: 'bg-kivo-cyan/20 text-kivo-cyan border-kivo-cyan/40 shadow-[0_4px_12px_rgba(0,217,245,0.25)]',
              purple: 'bg-kivo-purple/20 text-kivo-purple border-kivo-purple/40 shadow-[0_4px_12px_rgba(165,43,250,0.25)]',
            }[pillar.color as 'blue' | 'cyan' | 'purple'];

            return (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="p-6 rounded-2xl card-3d preserve-3d bg-gradient-to-b from-[#0D1322]/90 to-[#070A12]/95 border border-white/[0.1] hover:border-white/[0.25] transition-all group shadow-lg"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border mb-5 group-hover:scale-110 translate-z-6 transition-transform ${iconBorder}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="badge-3d text-[11px] font-semibold text-slate-300 uppercase tracking-wider inline-block px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.1] mb-2 translate-z-2">
                  {pillar.badge}
                </span>
                <h4 className="text-lg font-bold text-white mb-2 font-display translate-z-2">
                  {pillar.title}
                </h4>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed translate-z-1">
                  {pillar.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
