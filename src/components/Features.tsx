import React from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  KeyRound,
  EyeOff,
  Users,
  Search,
  Palette,
  ArrowDownToLine,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useCms } from '../context/CmsContext';

interface FeatureItem {
  icon: React.ElementType;
  title: string;
  badge: string;
  color: 'blue' | 'cyan' | 'purple';
  description: string;
  points: string[];
}

const featuresList: FeatureItem[] = [
  {
    icon: ShieldCheck,
    title: 'Privacy Protection',
    badge: 'Core Engine',
    color: 'blue',
    description: 'Block intrusive ads and invasive tracking scripts before they can load into your browser session.',
    points: [
      'Built-in ad and tracker blocking',
      'Privacy-focused browsing by default',
    ],
  },
  {
    icon: KeyRound,
    title: 'Built-in Password Manager',
    badge: 'Security',
    color: 'purple',
    description: 'Manage and autofill your login credentials securely without relying on third-party cloud extensions.',
    points: [
      'Secure password storage',
      'Convenient autofill across websites',
    ],
  },
  {
    icon: EyeOff,
    title: 'Incognito Mode',
    badge: 'Zero Traces',
    color: 'cyan',
    description: 'Browse with ephemeral sessions where cookies, site history, and cached forms are purged upon closing.',
    points: [
      'Private browsing sessions',
      'Isolated memory and history clearing',
    ],
  },
  {
    icon: Users,
    title: 'Multiple Profiles',
    badge: 'Workspace',
    color: 'blue',
    description: 'Keep your work, personal, and study environments separated with isolated cookies and extensions.',
    points: [
      'Separate browsing environments',
      'Independent sessions & history per profile',
    ],
  },
  {
    icon: Search,
    title: 'Smart Search',
    badge: 'Productivity',
    color: 'cyan',
    description: 'Find what you need instantly with fast address bar navigation and responsive search suggestions.',
    points: [
      'Live search suggestions',
      'Quick shortcut key navigation',
    ],
  },
  {
    icon: Palette,
    title: 'Personalization',
    badge: 'Aesthetic',
    color: 'purple',
    description: 'Make KIVO truly yours with custom wallpapers, vibrant themes, font controls, and layout preferences.',
    points: [
      'Custom wallpapers & backgrounds',
      'Themes, fonts, and customizable homepage',
    ],
  },
  {
    icon: ArrowDownToLine,
    title: 'Download Manager',
    badge: 'Utility',
    color: 'blue',
    description: 'Track, organize, and manage your downloaded files directly within an integrated desktop interface.',
    points: [
      'Manage downloaded files efficiently',
      'Quick access and sorting tools',
    ],
  },
  {
    icon: RefreshCw,
    title: 'Automatic Updates',
    badge: 'Reliability',
    color: 'cyan',
    description: 'Receive seamless version upgrades and security improvements to stay up to date with supported releases.',
    points: [
      'Stay up to date with supported releases',
      'Unobtrusive desktop updates',
    ],
  },
];

export const Features: React.FC = () => {
  const { content } = useCms();
  const cmsFeatures = content.features;

  return (
    <section id="features" className="py-24 sm:py-32 relative overflow-hidden bg-kivo-bg">
      {/* Background glow elements with organic flow */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-kivo-blue/10 blur-[130px] rounded-full pointer-events-none animate-ambient-orb" />
      <div className="absolute bottom-10 right-0 w-96 h-96 bg-kivo-purple/10 blur-[130px] rounded-full pointer-events-none animate-pulse-glow" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-semibold text-kivo-cyan mb-4"
          >
            <Sparkles className="w-3.5 h-3.5 text-kivo-cyan" />
            <span>Built For Performance & Privacy</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-display mb-6"
          >
            {cmsFeatures?.sectionTitle || (
              <>
                Everything You Need.{' '}
                <span className="text-gradient-cyan-purple">
                  Nothing You Don't.
                </span>
              </>
            )}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-base sm:text-lg text-slate-400 leading-relaxed font-normal"
          >
            {cmsFeatures?.sectionSubtitle ||
              'A desktop browser engineered without bloatware, heavy surveillance, or confusing menus. Only fast, purposeful tools.'}
          </motion.p>
        </div>

        {/* 8 Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuresList.map((feature, index) => {
            const Icon = feature.icon;

            const glowClasses = {
              blue: 'group-hover:border-kivo-blue/40 group-hover:shadow-[0_0_25px_-5px_rgba(8,123,255,0.25)]',
              cyan: 'group-hover:border-kivo-cyan/40 group-hover:shadow-[0_0_25px_-5px_rgba(0,217,245,0.25)]',
              purple: 'group-hover:border-kivo-purple/40 group-hover:shadow-[0_0_25px_-5px_rgba(165,43,250,0.25)]',
            }[feature.color];

            const iconColors = {
              blue: 'bg-kivo-blue/15 text-kivo-blue border-kivo-blue/30',
              cyan: 'bg-kivo-cyan/15 text-kivo-cyan border-kivo-cyan/30',
              purple: 'bg-kivo-purple/15 text-kivo-purple border-kivo-purple/30',
            }[feature.color];

            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: index * 0.06 }}
                className={`group relative p-6 rounded-2xl bg-gradient-to-b from-[#0C1220]/80 to-[#070B13]/90 border border-white/[0.08] backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:border-white/20 ${glowClasses} flex flex-col justify-between overflow-hidden`}
              >
                {/* Subtle card top gradient shine on hover */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-kivo-cyan/0 to-transparent group-hover:via-kivo-cyan/60 transition-all duration-500" />

                <div>
                  {/* Top Bar: Icon + Badge */}
                  <div className="flex items-center justify-between mb-5">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 ${iconColors}`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-slate-300 transition-colors group-hover:border-white/20">
                      {feature.badge}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-bold text-white mb-2 font-display group-hover:text-white transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">
                    {feature.description}
                  </p>
                </div>

                {/* Sub-points */}
                <div className="pt-4 border-t border-white/[0.06] space-y-2">
                  {feature.points.map((point, pIdx) => (
                    <div key={pIdx} className="flex items-start gap-2 text-xs text-slate-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-kivo-cyan mt-1 flex-shrink-0" />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
