import React from 'react';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  Sparkles,
  Brain,
  Radio,
  Code2,
  Globe,
  Layers,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { LinkedInIcon, GitHubIcon } from './SocialIcons';
import logoImg from '../assets/kivo-logo.png';

export const CeoSection: React.FC = () => {
  const expertiseItems = [
    {
      title: 'Artificial Intelligence & Machine Learning',
      icon: Brain,
      color: 'blue',
      glow: 'from-kivo-blue/20 to-transparent',
      borderColor: 'group-hover:border-kivo-blue/40',
      iconColor: 'text-kivo-blue',
    },
    {
      title: 'Internet of Things (IoT)',
      icon: Radio,
      color: 'cyan',
      glow: 'from-kivo-cyan/20 to-transparent',
      borderColor: 'group-hover:border-kivo-cyan/40',
      iconColor: 'text-kivo-cyan',
    },
    {
      title: 'Frontend Development',
      icon: Code2,
      color: 'purple',
      glow: 'from-kivo-purple/20 to-transparent',
      borderColor: 'group-hover:border-kivo-purple/40',
      iconColor: 'text-kivo-purple',
    },
    {
      title: 'Web Technologies',
      icon: Globe,
      color: 'blue',
      glow: 'from-kivo-blue/20 to-transparent',
      borderColor: 'group-hover:border-kivo-blue/40',
      iconColor: 'text-kivo-blue',
    },
    {
      title: 'UI/UX and Modern Web Experiences',
      icon: Layers,
      color: 'cyan',
      glow: 'from-kivo-cyan/20 to-transparent',
      borderColor: 'group-hover:border-kivo-cyan/40',
      iconColor: 'text-kivo-cyan',
    },
    {
      title: 'Technology Innovation',
      icon: Zap,
      color: 'purple',
      glow: 'from-kivo-purple/20 to-transparent',
      borderColor: 'group-hover:border-kivo-purple/40',
      iconColor: 'text-kivo-purple',
    },
  ];

  return (
    <section id="about-ceo" className="py-24 sm:py-32 relative overflow-hidden bg-kivo-bg">
      {/* Background ambient lighting matching KIVO aesthetic */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-kivo-blue/10 blur-[150px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-kivo-purple/10 blur-[150px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-semibold text-kivo-cyan mb-4 backdrop-blur-md"
          >
            <Sparkles className="w-3.5 h-3.5 text-kivo-cyan" />
            <span>KIVO Leadership & Vision</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-display mb-6"
          >
            About the{' '}
            <span className="text-gradient-kivo">
              CEO & Co-Founder
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal max-w-2xl mx-auto"
          >
            Meet the driving force behind KIVO Browser’s architecture, user experience, and privacy-focused digital freedom.
          </motion.p>
        </div>

        {/* Main Leadership Profile Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-6xl mx-auto">
          {/* Left Column: Executive Identity & Credentials Card */}
          <motion.div
            initial={{ opacity: 0, x: -25 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="lg:col-span-5 rounded-3xl bg-gradient-to-b from-[#0F1628]/90 via-[#0A0F1D]/90 to-[#070B14]/95 border border-white/[0.1] p-8 sm:p-10 backdrop-blur-2xl shadow-2xl relative overflow-hidden flex flex-col justify-between"
          >
            {/* Top decorative gradient glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-kivo-blue/15 blur-3xl rounded-full pointer-events-none" />

            <div>
              {/* Executive Avatar / Emblem */}
              <div className="relative mb-8 flex items-center justify-between">
                <div className="relative">
                  {/* Concentric glowing rings */}
                  <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-r from-kivo-blue via-kivo-cyan to-kivo-purple opacity-70 blur-md animate-pulse" />
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-[#090D1A] border border-white/[0.15] flex items-center justify-center shadow-xl">
                    <span className="text-3xl sm:text-4xl font-extrabold font-display text-gradient-kivo tracking-wider">
                      SS
                    </span>
                  </div>
                </div>

                {/* KIVO Co-Founder Badge */}
                <div className="flex flex-col items-end gap-1.5">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.1] p-1.5 flex items-center justify-center">
                    <img src={logoImg} alt="KIVO" className="w-full h-full object-contain" />
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-kivo-cyan/10 border border-kivo-cyan/25 text-[11px] font-semibold text-kivo-cyan">
                    Co-Founder
                  </span>
                </div>
              </div>

              {/* Name & Title */}
              <div className="mb-6">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-display mb-1.5 tracking-tight">
                  Shaurya Sharma
                </h3>
                <p className="text-sm sm:text-base font-semibold text-gradient-kivo">
                  CEO & Co-Founder of KIVO Browser
                </p>
              </div>

              {/* Education Card */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] mb-8 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <GraduationCap className="w-4 h-4 text-kivo-cyan flex-shrink-0" />
                  <span>Education</span>
                </div>
                <div className="pl-6 space-y-1">
                  <p className="text-sm font-bold text-white leading-snug">
                    B.Tech in Electronics & Communication Engineering (AI & ML)
                  </p>
                  <p className="text-xs text-slate-400">
                    Gautam Buddha University
                  </p>
                </div>
              </div>
            </div>

            {/* Social Profile Links */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Connect & Collaborate
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href="https://linkedin.com/in/shaurya-sharma200"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] hover:border-[#0A66C2]/60 text-slate-200 hover:text-white text-xs font-semibold transition-all duration-200 shadow-sm hover:shadow-lg hover:shadow-[#0A66C2]/15"
                >
                  <LinkedInIcon className="w-4 h-4 text-[#0A66C2] group-hover:scale-110 transition-transform" />
                  <span>LinkedIn Profile</span>
                  <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-slate-300 transition-colors ml-auto" />
                </a>

                <a
                  href="https://github.com/mrshauryasharma"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] hover:border-kivo-purple/60 text-slate-200 hover:text-white text-xs font-semibold transition-all duration-200 shadow-sm hover:shadow-lg hover:shadow-kivo-purple/15"
                >
                  <GitHubIcon className="w-4 h-4 text-slate-200 group-hover:scale-110 transition-transform" />
                  <span>GitHub Profile</span>
                  <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-slate-300 transition-colors ml-auto" />
                </a>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Professional Profile & Areas of Expertise */}
          <motion.div
            initial={{ opacity: 0, x: 25 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="lg:col-span-7 flex flex-col justify-between space-y-6"
          >
            {/* Professional Profile Narrative Card */}
            <div className="p-8 sm:p-9 rounded-3xl bg-gradient-to-b from-[#0F1628]/80 to-[#070B14]/90 border border-white/[0.1] backdrop-blur-2xl shadow-xl relative overflow-hidden">
              <div className="flex items-center gap-2 mb-4 text-xs font-semibold uppercase tracking-wider text-kivo-cyan">
                <Sparkles className="w-3.5 h-3.5 text-kivo-cyan" />
                <span>Executive Profile</span>
              </div>
              <h4 className="text-xl sm:text-2xl font-bold text-white font-display mb-4">
                Visionary Leadership in Next-Gen Browsing
              </h4>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                Shaurya Sharma is the CEO and Co-Founder of KIVO Browser, with a strong interest and expertise in technology, IoT and frontend development. His academic background in Electronics & Communication Engineering with AI & ML, combined with his interest in building modern digital experiences, contributes to his vision for KIVO Browser.
              </p>
            </div>

            {/* Areas of Expertise Grid */}
            <div>
              <div className="flex items-center justify-between mb-4 px-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Areas of Expertise
                </h4>
                <span className="text-[11px] text-slate-500 font-mono">Core Competencies</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {expertiseItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 15 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, delay: index * 0.06 }}
                      className={`group p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] ${item.borderColor} transition-all duration-300 flex items-center gap-3.5 shadow-sm hover:-translate-y-0.5`}
                    >
                      <div className={`w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform ${item.iconColor}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-white leading-snug">
                        {item.title}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
