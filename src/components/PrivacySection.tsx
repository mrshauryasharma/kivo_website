import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  EyeOff,
  KeyRound,
  CheckCircle2,
  Activity,
  Layers,
} from 'lucide-react';

export const PrivacySection: React.FC = () => {
  const [shieldActive, setShieldActive] = useState<boolean>(true);

  const trackerExamples = [
    { name: 'cross-site-telemetry.analytics', category: 'Behavioral Profiling', state: 'Blocked' },
    { name: 'ad-pixel.collector.js', category: 'Targeting Pixel', state: 'Blocked' },
    { name: 'canvas-fingerprint-probe', category: 'Device Fingerprinting', state: 'Neutralized' },
    { name: 'social-beacon.tracking', category: 'Third-party Beacon', state: 'Blocked' },
  ];

  return (
    <section id="privacy" className="py-24 sm:py-32 relative overflow-hidden bg-[#070A12]">
      {/* Background Lighting & Glows with smooth organic flow */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-kivo-blue/15 blur-[140px] rounded-full pointer-events-none animate-ambient-orb" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-kivo-purple/15 blur-[140px] rounded-full pointer-events-none animate-pulse-glow" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-kivo-blue/10 border border-kivo-blue/20 text-xs font-semibold text-kivo-cyan mb-4"
          >
            <Shield className="w-3.5 h-3.5 text-kivo-cyan" />
            <span>Sovereign Browsing Architecture</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-display mb-6"
          >
            Your Privacy.{' '}
            <span className="text-gradient-cyan-purple">
              Your Control.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-base sm:text-lg text-slate-400 leading-relaxed font-normal"
          >
            Your browsing experience should belong to you. KIVO is designed with privacy and control at its core.
          </motion.p>
        </div>

        {/* 2-Column Showcase: Shield Interactive Visual + 4 Privacy Pillars */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Shield-Themed Visual with Blue and Purple Lighting */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-6 relative"
          >
            {/* Outer Glow Ring */}
            <div className="absolute -inset-2 bg-gradient-to-r from-kivo-blue/30 via-kivo-cyan/20 to-kivo-purple/30 rounded-3xl blur-2xl opacity-60" />

            <div className="relative rounded-3xl bg-gradient-to-b from-[#0F162A]/90 to-[#0A0D18]/95 border border-white/[0.12] p-6 sm:p-8 backdrop-blur-2xl shadow-2xl">
              {/* Header inside shield panel */}
              <div className="flex items-center justify-between pb-6 border-b border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-kivo-blue to-kivo-purple flex items-center justify-center text-white shadow-glow-blue">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-white font-display">
                      KIVO Shield Engine
                    </h4>
                    <p className="text-xs text-slate-400">
                      Real-time Network Filter
                    </p>
                  </div>
                </div>

                {/* Interactive Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShieldActive(!shieldActive)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    shieldActive
                      ? 'bg-kivo-cyan/15 text-kivo-cyan border-kivo-cyan/30 shadow-[0_0_15px_rgba(0,217,245,0.2)]'
                      : 'bg-white/5 text-slate-400 border-white/10'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${shieldActive ? 'bg-kivo-cyan animate-pulse' : 'bg-slate-500'}`} />
                  <span>{shieldActive ? 'Protection Active' : 'Protection Paused'}</span>
                </button>
              </div>

              {/* Central Shield Graphic with Blue & Purple Lighting */}
              <div className="py-8 sm:py-10 flex flex-col items-center justify-center relative">
                {/* Orbiting concentric rings */}
                <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full border border-kivo-blue/20 flex items-center justify-center relative animate-spin" style={{ animationDuration: '30s' }}>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-kivo-cyan rounded-full shadow-[0_0_8px_#00d9f5]" />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-kivo-purple rounded-full shadow-[0_0_8px_#a52bfa]" />
                </div>

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-36 h-36 sm:w-40 sm:h-40 rounded-full border border-kivo-purple/30 flex items-center justify-center bg-gradient-to-b from-kivo-blue/10 via-transparent to-kivo-purple/10">
                    <div className="relative">
                      {/* Shield Core */}
                      <Shield
                        className={`w-16 h-16 sm:w-20 sm:h-20 transition-all duration-300 ${
                          shieldActive
                            ? 'text-white drop-shadow-[0_0_20px_rgba(0,217,245,0.7)]'
                            : 'text-slate-600'
                        }`}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        {shieldActive ? (
                          <CheckCircle2 className="w-8 h-8 text-kivo-cyan drop-shadow-md" />
                        ) : (
                          <ShieldAlert className="w-8 h-8 text-slate-500" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Filter Activity Log */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Activity className="w-3.5 h-3.5 text-kivo-cyan" />
                    Inspection Stream
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {shieldActive ? 'Active Filtering' : 'Direct Pass-through'}
                  </span>
                </div>

                {trackerExamples.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-black/40 border border-white/[0.05] text-xs font-mono"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className={`w-1.5 h-1.5 rounded-full ${shieldActive ? 'bg-kivo-cyan' : 'bg-amber-400'}`} />
                      <span className="text-slate-300 truncate max-w-[180px] sm:max-w-xs">{item.name}</span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-sans font-medium ${
                        shieldActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {shieldActive ? item.state : 'Allowed'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right Column: 4 Privacy Pillars */}
          <div className="lg:col-span-6 space-y-4 sm:space-y-5">
            {/* Pillar 1: Ad and tracker blocking */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-white/[0.04] to-transparent border border-white/[0.08] hover:border-kivo-blue/40 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-kivo-blue/15 border border-kivo-blue/30 flex items-center justify-center text-kivo-blue flex-shrink-0 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 font-display flex items-center gap-2">
                    Ad and Tracker Blocking
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Stops cross-site tracking scripts and unsolicited commercial advertisements before network requests trigger, speeding up page render times and preserving bandwidth.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Pillar 2: Private browsing */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-white/[0.04] to-transparent border border-white/[0.08] hover:border-kivo-cyan/40 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-kivo-cyan/15 border border-kivo-cyan/30 flex items-center justify-center text-kivo-cyan flex-shrink-0 group-hover:scale-105 transition-transform">
                  <EyeOff className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 font-display flex items-center gap-2">
                    Private Browsing
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Dedicated incognito windows run in segregated RAM sandboxes. Browsing history, cached assets, and session cookies are cleanly eliminated when you close the window.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Pillar 3: Browser profile controls */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-white/[0.04] to-transparent border border-white/[0.08] hover:border-kivo-purple/40 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-kivo-purple/15 border border-kivo-purple/30 flex items-center justify-center text-kivo-purple flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 font-display flex items-center gap-2">
                    Browser Profile Controls
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Segregate your digital identities. Create independent profiles for work, personal browsing, or testing with zero cross-profile state leakage.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Pillar 4: Password management */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-white/[0.04] to-transparent border border-white/[0.08] hover:border-kivo-blue/40 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-kivo-blue/15 border border-kivo-blue/30 flex items-center justify-center text-kivo-blue flex-shrink-0 group-hover:scale-105 transition-transform">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 font-display flex items-center gap-2">
                    Password Management
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Store and organize your credentials locally on your desktop. Autofill logins with convenience while keeping your credentials under your direct supervision.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};
