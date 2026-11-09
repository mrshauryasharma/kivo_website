import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  ArrowRight,
  Shield,
  ShieldCheck,
  Search,
  Lock,
  RotateCw,
  ArrowLeft,
  ArrowRight as ArrowFwd,
  Plus,
  Compass,
  Star,
  Layers,
  Settings,
  Sparkles,
  Zap,
} from 'lucide-react';
import logoImg from '../assets/kivo-logo.png';
import { MagneticButton } from './MagneticButton';
import { useCms } from '../context/CmsContext';

// Custom clean SVGs for Android, Windows and Apple platforms
export const AndroidIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9996.4482.9996.9993.0001.5511-.4486.9997-.9996.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9997.4482.9997.9993 0 .5511-.4486.9997-.9997.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4116 13.8533 8.0838 12 8.0838s-3.5902.3278-5.1368.8659L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396" />
  </svg>
);

export const WindowsIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.802" />
  </svg>
);

export const AppleIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.98.6-2.62 1.35-.57.65-.98 1.72-.85 2.73.99.08 2.02-.51 2.55-1.23z" />
  </svg>
);

export const Hero: React.FC = () => {
  const { content } = useCms();
  const hero = content.hero;
  const [activeTab, setActiveTab] = useState<'kivo' | 'github'>('kivo');

  const scrollTo = (id: string) => {
    const el = document.querySelector(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="home" className="relative pt-32 pb-20 sm:pt-40 sm:pb-32 overflow-hidden">
      {/* Background Ambient Glows with Organic Flow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[900px] h-[450px] bg-gradient-to-tr from-kivo-blue/20 via-kivo-cyan/15 to-kivo-purple/20 blur-[130px] rounded-full pointer-events-none -z-10 animate-ambient-orb" />
      <div className="absolute top-10 right-10 w-96 h-96 bg-kivo-purple/10 blur-[120px] rounded-full pointer-events-none -z-10 animate-pulse-glow" />
      <div className="absolute top-40 left-10 w-96 h-96 bg-kivo-blue/10 blur-[120px] rounded-full pointer-events-none -z-10 animate-pulse-glow" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Copy */}
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.1] backdrop-blur-md mb-8 group"
          >
            <div className="w-2 h-2 rounded-full bg-kivo-cyan animate-pulse" />
            <span className="text-xs sm:text-sm font-medium text-slate-300">
              {hero?.badge || 'Next-Generation Desktop Browser'}
            </span>
            <span className="text-white/30">•</span>
            <span className="text-xs sm:text-sm font-semibold text-gradient-cyan-purple flex items-center gap-1">
              Privacy First
              <Sparkles className="w-3 h-3 text-kivo-purple" />
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-7xl lg:text-8xl font-extrabold tracking-tight text-white mb-4 font-display"
          >
            {hero?.title ? (
              hero.title.includes(' ') ? (
                <>
                  {hero.title.split(' ').slice(0, -1).join(' ')}{' '}
                  <span className="text-gradient-kivo drop-shadow-sm">
                    {hero.title.split(' ').slice(-1)[0]}
                  </span>
                </>
              ) : (
                <span className="text-gradient-kivo drop-shadow-sm">{hero.title}</span>
              )
            ) : (
              <>
                Browse{' '}
                <span className="text-gradient-kivo drop-shadow-sm">
                  Freely.
                </span>
              </>
            )}
          </motion.h1>

          {/* Supporting Headline */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl sm:text-2xl lg:text-3xl font-medium text-slate-200 mb-6"
          >
            {hero?.subtitle || 'Your browser. Your privacy. Your freedom.'}
          </motion.h2>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-base sm:text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed font-normal"
          >
            Meet <strong className="text-white font-medium">KIVO</strong> — a modern browser designed to give you a faster, cleaner, more private, and customizable browsing experience.
          </motion.p>

          {/* Call to Actions with Magnetic Pull */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8"
          >
            {/* Primary CTA */}
            <MagneticButton strength={0.2} className="w-full sm:w-auto">
              <button
                onClick={() => scrollTo(hero?.primaryCtaLink || '#download')}
                className="w-full sm:w-auto relative group rounded-full p-[1px] font-semibold text-white shadow-xl shadow-kivo-blue/20 transition-all duration-300 active:scale-95 hover:shadow-glow-kivo"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-kivo-blue via-kivo-cyan to-kivo-purple rounded-full animate-gradient-x opacity-95 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full bg-gradient-to-r from-kivo-blue via-[#066fdc] to-kivo-purple text-base font-semibold text-white transition-all">
                  <Download className="w-5 h-5 text-white group-hover:scale-110 transition-transform duration-200" />
                  <span>{hero?.primaryCtaText || 'Download KIVO'}</span>
                </div>
              </button>
            </MagneticButton>

            {/* Secondary CTA */}
            <MagneticButton strength={0.15} className="w-full sm:w-auto">
              <button
                onClick={() => scrollTo(hero?.secondaryCtaLink || '#features')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 hover:text-white border border-white/[0.1] hover:border-kivo-cyan/40 backdrop-blur-md text-base font-medium transition-all group duration-300"
              >
                <span>{hero?.secondaryCtaText || 'Explore Features'}</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-kivo-cyan group-hover:translate-x-1 transition-all" />
              </button>
            </MagneticButton>
          </motion.div>

          {/* Platform Availability Notice */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex items-center justify-center gap-4 text-xs sm:text-sm text-slate-400"
          >
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="text-slate-400">Available for</span>
            </span>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-slate-300">
                <AndroidIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-medium">Android</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-slate-300">
                <WindowsIcon className="w-3.5 h-3.5 text-kivo-cyan" />
                <span className="font-medium">Windows</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-slate-300">
                <AppleIcon className="w-3.5 h-3.5 text-slate-200" />
                <span className="font-medium">macOS</span>
              </span>
            </div>
          </motion.div>
        </div>

        {/* Realistic Browser Interface Showcase Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-16 sm:mt-20 relative max-w-5xl mx-auto animate-float-mellow"
        >
          {/* Subtle Ambient Behind Mockup */}
          <div className="absolute -inset-1.5 bg-gradient-to-r from-kivo-blue/30 via-kivo-cyan/30 to-kivo-purple/30 rounded-2xl blur-xl opacity-75 animate-pulse-glow" />

          {/* Browser Window Chrome */}
          <div className="relative rounded-2xl bg-[#090D18] border border-white/[0.12] shadow-2xl overflow-hidden backdrop-blur-2xl">
            {/* Titlebar / Tab Strip */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#070A13] border-b border-white/[0.07] select-none">
              {/* Window Controls */}
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]/40" />
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]/40" />
                <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]/40" />
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1.5 ml-4 flex-1 max-w-xl">
                {/* Active Tab: KIVO Home */}
                <button
                  type="button"
                  onClick={() => setActiveTab('kivo')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'kivo'
                      ? 'bg-[#0E1526] text-white border border-white/[0.1] shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <img src={logoImg} alt="KIVO icon" className="w-3.5 h-3.5 object-contain" />
                  <span className="truncate max-w-[120px]">KIVO — Home</span>
                </button>

                {/* Inactive Tab: GitHub */}
                <button
                  type="button"
                  onClick={() => setActiveTab('github')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'github'
                      ? 'bg-[#0E1526] text-white border border-white/[0.1] shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate max-w-[120px]">Explore Web</span>
                </button>

                <button
                  type="button"
                  aria-label="New Tab"
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Window Title & Right Tools */}
              <div className="hidden sm:flex items-center gap-2 text-slate-400">
                <div className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-slate-400">
                  <Zap className="w-3 h-3 text-kivo-cyan" />
                  <span>v1.0 Ready</span>
                </div>
              </div>
            </div>

            {/* Address & Navigation Toolbar */}
            <div className="flex items-center gap-3 px-4 py-2 bg-[#0A0F1D] border-b border-white/[0.06]">
              {/* Nav Arrows */}
              <div className="flex items-center gap-1 text-slate-400">
                <button
                  type="button"
                  aria-label="Back"
                  className="p-1 rounded hover:bg-white/[0.06] hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Forward"
                  className="p-1 rounded opacity-40 cursor-not-allowed"
                >
                  <ArrowFwd className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Reload"
                  className="p-1 rounded hover:bg-white/[0.06] hover:text-white transition-colors"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Address / Search Bar */}
              <div className="flex-1 flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#060913] border border-white/[0.09] text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-mono text-slate-400">kivo://</span>
                  <span className="text-white font-medium">startpage</span>
                </div>

                {/* Built-in Shield status badge inside address bar */}
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-kivo-cyan/10 border border-kivo-cyan/30 text-[11px] text-kivo-cyan font-medium">
                  <ShieldCheck className="w-3 h-3 text-kivo-cyan" />
                  <span className="hidden sm:inline">KIVO Shield:</span>
                  <span>Active</span>
                </div>
              </div>

              {/* Right Toolbar Icons */}
              <div className="flex items-center gap-1.5 text-slate-400">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-kivo-blue to-kivo-purple flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                  K
                </div>
              </div>
            </div>

            {/* In-Browser Realistic Homepage View */}
            <div className="relative p-6 sm:p-12 min-h-[380px] sm:min-h-[440px] flex flex-col items-center justify-center bg-gradient-to-b from-[#080C17] to-[#04060B]">
              {/* Wallpaper Grid Pattern */}
              <div
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.25) 1px, transparent 0)`,
                  backgroundSize: '24px 24px',
                }}
              />

              {/* Browser Center Content */}
              <div className="relative z-10 w-full max-w-xl mx-auto text-center flex flex-col items-center">
                {/* Logo & Glow */}
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 mb-5">
                  <div className="absolute inset-0 bg-kivo-cyan/30 blur-xl rounded-full" />
                  <img
                    src={logoImg}
                    alt="KIVO Original Logo"
                    className="w-full h-full object-contain relative z-10"
                  />
                </div>

                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2 font-display">
                  Browse with Sovereignty
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mb-6">
                  Zero telemetry. Zero ad tracking. Complete freedom.
                </p>

                {/* Browser Search Input */}
                <div className="w-full relative mb-8">
                  <div className="absolute inset-0 bg-gradient-to-r from-kivo-blue/20 to-kivo-purple/20 rounded-xl blur-md" />
                  <div className="relative flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0F1626]/90 border border-white/[0.12] text-slate-300 shadow-lg">
                    <Search className="w-4 h-4 text-kivo-cyan flex-shrink-0" />
                    <input
                      type="text"
                      readOnly
                      placeholder="Search the web privately or enter address..."
                      className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none cursor-default"
                    />
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/[0.06] text-[10px] font-mono text-slate-400 border border-white/[0.08]">
                      <span>⌘K</span>
                    </div>
                  </div>
                </div>

                {/* Speed Dials / Quick Access Shortcuts */}
                <div className="grid grid-cols-4 sm:grid-cols-4 gap-3 w-full max-w-md">
                  {[
                    { label: 'Bookmarks', icon: Star, color: 'text-amber-400' },
                    { label: 'Profiles', icon: Layers, color: 'text-kivo-cyan' },
                    { label: 'Shield Hub', icon: Shield, color: 'text-kivo-blue' },
                    { label: 'Customize', icon: Settings, color: 'text-kivo-purple' },
                  ].map((tile, i) => (
                    <div
                      key={i}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-all cursor-default group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center group-hover:scale-105 transition-transform">
                        <tile.icon className={`w-4 h-4 ${tile.color}`} />
                      </div>
                      <span className="text-[11px] font-medium text-slate-300">
                        {tile.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Live Privacy Metrics Bar inside Mockup */}
                <div className="mt-8 inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 text-kivo-cyan font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    1,420 Trackers Blocked
                  </span>
                  <span className="text-white/20">•</span>
                  <span className="text-slate-300">0 KB Telemetry Sent</span>
                  <span className="text-white/20">•</span>
                  <span className="text-kivo-purple font-medium">Clean Browsing</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
