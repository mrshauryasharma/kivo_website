import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layout,
  Shield,
  Palette,
  Users,
  Search,
  Lock,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Plus,
  Sliders,
  Check,
  Globe,
  Star,
  Monitor,
  Bookmark,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import logoImg from '../assets/kivo-logo.png';

export const BrowserShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'homepage' | 'privacy' | 'customization' | 'profiles'>('homepage');
  const [selectedTheme, setSelectedTheme] = useState<'kivo' | 'cyber' | 'electric' | 'minimal'>('kivo');

  const tabsConfig = [
    { id: 'homepage', label: 'Homepage & Search', icon: Layout },
    { id: 'privacy', label: 'Shield & Security Center', icon: Shield },
    { id: 'customization', label: 'Customization Interface', icon: Palette },
    { id: 'profiles', label: 'Multiple Profiles', icon: Users },
  ] as const;

  return (
    <section id="showcase" className="py-24 sm:py-32 relative overflow-hidden bg-kivo-bg">
      {/* Background glow effects with organic drift */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-r from-kivo-blue/15 via-kivo-cyan/15 to-kivo-purple/15 blur-[150px] rounded-full pointer-events-none animate-ambient-orb" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-semibold text-kivo-cyan mb-4"
          >
            <Monitor className="w-3.5 h-3.5 text-kivo-cyan" />
            <span>Refined Desktop Experience</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-display mb-6"
          >
            Crafted For Clarity.{' '}
            <span className="text-gradient-kivo">
              Designed For You.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-base sm:text-lg text-slate-400 leading-relaxed font-normal"
          >
            Explore the KIVO browser interface. Every control, tab, and customization tool is placed intentionally for effortless productivity.
          </motion.p>
        </div>

        {/* Interactive View Selector Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-10 max-w-4xl mx-auto">
          {tabsConfig.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-r from-kivo-blue via-[#0c73e8] to-kivo-purple text-white shadow-glow-blue border border-white/20 scale-105'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.06]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dedicated Browser Showcase Frame */}
        <motion.div
          layout
          className="relative max-w-5xl mx-auto rounded-2xl bg-[#080C16] border border-white/[0.12] shadow-2xl overflow-hidden backdrop-blur-2xl"
        >
          {/* Top Window Chrome: Tab Strip */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#060912] border-b border-white/[0.07] select-none">
            {/* Window control dots */}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]/40" />
              <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]/40" />
              <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]/40" />
            </div>

            {/* Browser Tabs */}
            <div className="flex items-center gap-1.5 ml-4 flex-1 max-w-xl">
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#0E1527] text-white border border-white/[0.1] text-xs font-medium shadow-sm">
                <img src={logoImg} alt="KIVO" className="w-3.5 h-3.5 object-contain" />
                <span className="truncate">
                  {activeTab === 'homepage' && 'KIVO — New Tab'}
                  {activeTab === 'privacy' && 'KIVO Shield — Security Dashboard'}
                  {activeTab === 'customization' && 'Settings — Theme & Appearance'}
                  {activeTab === 'profiles' && 'Profile Workspace — Development'}
                </span>
              </div>

              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 text-xs font-medium">
                <Globe className="w-3.5 h-3.5" />
                <span className="truncate">Documentation</span>
              </div>

              <button
                type="button"
                aria-label="New Tab"
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/[0.06]"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Profile badge */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-[11px] text-slate-300">
                <span className="w-2 h-2 rounded-full bg-kivo-cyan" />
                <span className="hidden sm:inline">Active Profile:</span>
                <span className="font-semibold text-white">Default</span>
              </div>
            </div>
          </div>

          {/* Navigation Bar / Address Bar */}
          <div className="flex items-center gap-3 px-4 py-2 bg-[#0A0E1A] border-b border-white/[0.06]">
            <div className="flex items-center gap-1 text-slate-400">
              <button type="button" aria-label="Back" className="p-1 hover:text-white">
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button type="button" aria-label="Forward" className="p-1 text-slate-600">
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button type="button" aria-label="Reload" className="p-1 hover:text-white">
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Address Bar */}
            <div className="flex-1 flex items-center justify-between px-3.5 py-1.5 rounded-lg bg-[#060810] border border-white/[0.09] text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-mono text-slate-400">kivo://</span>
                <span className="text-white font-medium">
                  {activeTab === 'homepage' && 'home'}
                  {activeTab === 'privacy' && 'shield-center'}
                  {activeTab === 'customization' && 'appearance'}
                  {activeTab === 'profiles' && 'profiles-manager'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-kivo-cyan/15 text-kivo-cyan border border-kivo-cyan/30 text-[10px] font-semibold">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Shield 100%</span>
                </div>
                <Bookmark className="w-3.5 h-3.5 text-slate-400 hover:text-amber-400 cursor-pointer" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-300">
                <Sliders className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Bookmarks bar */}
          <div className="hidden sm:flex items-center gap-4 px-4 py-1.5 bg-[#080B14] border-b border-white/[0.04] text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5 hover:text-white cursor-default">
              <Star className="w-3 h-3 text-amber-400" /> Web Standards
            </span>
            <span className="flex items-center gap-1.5 hover:text-white cursor-default">
              <Globe className="w-3 h-3 text-kivo-cyan" /> GitHub
            </span>
            <span className="flex items-center gap-1.5 hover:text-white cursor-default">
              <Shield className="w-3 h-3 text-kivo-purple" /> Privacy Guides
            </span>
            <span className="flex items-center gap-1.5 hover:text-white cursor-default">
              <Cpu className="w-3 h-3 text-emerald-400" /> Benchmarks
            </span>
          </div>

          {/* Active View Container with Tab Switching Animation */}
          <div className="p-6 sm:p-10 min-h-[440px] bg-gradient-to-b from-[#080C18] to-[#04060C] flex flex-col justify-center">
            <AnimatePresence mode="wait">
              {/* VIEW 1: Homepage & Smart Search */}
              {activeTab === 'homepage' && (
                <motion.div
                  key="homepage"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center text-center max-w-xl mx-auto"
                >
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 mb-4">
                    <div className="absolute inset-0 bg-kivo-cyan/30 blur-xl rounded-full" />
                    <img
                      src={logoImg}
                      alt="KIVO Original Logo"
                      className="w-full h-full object-contain relative z-10"
                    />
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2 font-display">
                    Welcome to KIVO
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 mb-6">
                    A clean slate for your thoughts, searches, and daily work.
                  </p>

                  {/* Smart Search Bar */}
                  <div className="w-full mb-8">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0F1628] border border-white/[0.14] text-slate-300 shadow-xl">
                      <Search className="w-4 h-4 text-kivo-cyan" />
                      <input
                        type="text"
                        readOnly
                        value="Search the web privately or enter URL..."
                        className="w-full bg-transparent text-sm text-slate-300 focus:outline-none cursor-default"
                      />
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.08] text-slate-400 border border-white/[0.08]">
                        Return ↵
                      </span>
                    </div>
                  </div>

                  {/* Quick Dial Grid */}
                  <div className="grid grid-cols-4 gap-3 w-full max-w-md mb-8">
                    {[
                      { name: 'Research', icon: Globe, color: 'text-kivo-cyan' },
                      { name: 'Developer', icon: Cpu, color: 'text-kivo-blue' },
                      { name: 'Vault', icon: Lock, color: 'text-amber-400' },
                      { name: 'Studio', icon: Palette, color: 'text-kivo-purple' },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] transition-all flex flex-col items-center gap-2 group cursor-default"
                      >
                        <div className="w-9 h-9 rounded-lg bg-white/[0.05] flex items-center justify-center">
                          <item.icon className={`w-4 h-4 ${item.color}`} />
                        </div>
                        <span className="text-[11px] font-medium text-slate-300">
                          {item.name}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>0 Trackers Active • Local Search Engine • Fast DNS Resolution</span>
                  </div>
                </motion.div>
              )}

              {/* VIEW 2: Shield & Security Center */}
              {activeTab === 'privacy' && (
                <motion.div
                  key="privacy"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-2xl mx-auto w-full"
                >
                  <div className="p-6 rounded-2xl bg-[#0D1424] border border-white/[0.1] shadow-xl">
                    <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-kivo-blue/20 text-kivo-cyan flex items-center justify-center">
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-white font-display">
                            KIVO Shield Controls
                          </h4>
                          <p className="text-xs text-slate-400">
                            Customizable privacy protection rules for all sites
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
                        Aggressive Filtering
                      </span>
                    </div>

                    <div className="space-y-4">
                      {[
                        { title: 'Ad & Tracking Filter', desc: 'Blocks cross-origin advertising domains and analytics beacons', state: true },
                        { title: 'Canvas Fingerprinting Shield', desc: 'Randomizes device screen and GPU readout noise to prevent tracking', state: true },
                        { title: 'Cookie Auto-Partitioning', desc: 'Isolates cookies so third parties cannot trace you across domains', state: true },
                        { title: 'Automatic HTTPS Upgrader', desc: 'Forces secure transport on supported websites', state: true },
                      ].map((rule, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3.5 rounded-xl bg-black/30 border border-white/[0.05]"
                        >
                          <div>
                            <p className="text-xs sm:text-sm font-semibold text-white">
                              {rule.title}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {rule.desc}
                            </p>
                          </div>
                          <div className="w-9 h-5 rounded-full bg-kivo-blue p-0.5 flex items-center justify-end">
                            <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* VIEW 3: Customization Interface */}
              {activeTab === 'customization' && (
                <motion.div
                  key="customization"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-2xl mx-auto w-full"
                >
                  <div className="p-6 rounded-2xl bg-[#0D1424] border border-white/[0.1] shadow-xl">
                    <div className="flex items-center gap-3 pb-4 border-b border-white/[0.08] mb-6">
                      <div className="w-10 h-10 rounded-xl bg-kivo-purple/20 text-kivo-purple flex items-center justify-center">
                        <Palette className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-white font-display">
                          Personalization & Theme Studio
                        </h4>
                        <p className="text-xs text-slate-400">
                          Configure wallpapers, color accents, typography, and homepage widgets
                        </p>
                      </div>
                    </div>

                    {/* Theme Palettes */}
                    <div className="mb-6">
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                        Accent Theme Presets
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { id: 'kivo', name: 'KIVO Gradient', gradient: 'from-[#087BFF] via-[#00D9F5] to-[#A52BFA]' },
                          { id: 'cyber', name: 'Cyber Cyan', gradient: 'from-[#00D9F5] to-[#087BFF]' },
                          { id: 'electric', name: 'Electric Purple', gradient: 'from-[#A52BFA] to-[#087BFF]' },
                          { id: 'minimal', name: 'Onyx Minimal', gradient: 'from-slate-700 to-slate-900' },
                        ].map((th) => (
                          <button
                            key={th.id}
                            type="button"
                            onClick={() => setSelectedTheme(th.id as any)}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              selectedTheme === th.id
                                ? 'border-kivo-cyan bg-white/[0.08] shadow-sm'
                                : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                            }`}
                          >
                            <div className={`w-full h-5 rounded-md bg-gradient-to-r ${th.gradient} mb-2`} />
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-white">{th.name}</span>
                              {selectedTheme === th.id && <Check className="w-3.5 h-3.5 text-kivo-cyan" />}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Wallpaper & Font Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-3.5 rounded-xl bg-black/30 border border-white/[0.05]">
                        <span className="text-xs font-semibold text-slate-200 block mb-1">
                          Custom Background Wallpaper
                        </span>
                        <p className="text-[11px] text-slate-400 mb-2">
                          Upload high-res PNG/JPG or use dynamic ambient gradients.
                        </p>
                        <span className="inline-block text-[11px] font-medium text-kivo-cyan hover:underline cursor-pointer">
                          Choose local file...
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-black/30 border border-white/[0.05]">
                        <span className="text-xs font-semibold text-slate-200 block mb-1">
                          Font & UI Scaling
                        </span>
                        <p className="text-[11px] text-slate-400 mb-2">
                          Native system typography or Plus Jakarta Sans.
                        </p>
                        <span className="inline-block text-[11px] font-medium text-kivo-purple">
                          Default (100% Crisp)
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* VIEW 4: Multiple Profiles */}
              {activeTab === 'profiles' && (
                <motion.div
                  key="profiles"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-2xl mx-auto w-full"
                >
                  <div className="p-6 rounded-2xl bg-[#0D1424] border border-white/[0.1] shadow-xl">
                    <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-kivo-cyan/20 text-kivo-cyan flex items-center justify-center">
                          <Users className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-white font-display">
                            Isolated Profile Workspaces
                          </h4>
                          <p className="text-xs text-slate-400">
                            Separate cookies, history, and logins between distinct environments
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-kivo-blue text-xs font-semibold text-white shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Profile</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[
                        { name: 'Personal', status: 'Active', color: 'from-kivo-blue to-kivo-cyan', icon: '👤', tabs: '4 Open Tabs' },
                        { name: 'Work / Dev', status: 'Ready', color: 'from-kivo-purple to-pink-500', icon: '💼', tabs: '12 Open Tabs' },
                        { name: 'Research', status: 'Isolated', color: 'from-emerald-400 to-teal-500', icon: '🔬', tabs: '1 Open Tab' },
                      ].map((prof, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl bg-black/40 border border-white/[0.07] flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-2xl">{prof.icon}</span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300">
                                {prof.status}
                              </span>
                            </div>
                            <h5 className="text-sm font-bold text-white mb-1">
                              {prof.name}
                            </h5>
                            <p className="text-[11px] text-slate-400">
                              {prof.tabs}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="mt-4 w-full py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-slate-200 transition-colors"
                          >
                            Switch Profile
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
