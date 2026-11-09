import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Download, LifeBuoy } from 'lucide-react';
import logoImg from '../assets/kivo-logo.png';
import { MagneticButton } from './MagneticButton';

interface NavbarProps {
  onOpenLegal?: (tab: 'privacy' | 'terms') => void;
  onOpenSupport?: () => void;
  onNavigate?: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSupport,
  onNavigate,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '#home' },
    { name: 'About the CEO', href: '#about-ceo' },
    { name: 'Features', href: '#features' },
    { name: 'Privacy', href: '#privacy' },
    { name: 'Showcase', href: '#showcase' },
    { name: 'About', href: '#about' },
  ];

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-kivo-bg/80 backdrop-blur-xl border-b border-white/[0.08] shadow-lg shadow-black/50 py-3.5'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Left: Original KIVO Logo + Wordmark */}
          <a
            href="#home"
            onClick={(e) => handleScrollTo(e, '#home')}
            className="flex items-center gap-3 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-kivo-cyan rounded-lg"
          >
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0">
              <div className="absolute inset-0 bg-kivo-cyan/20 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <img
                src={logoImg}
                alt="KIVO Logo"
                className="w-full h-full object-contain relative z-10 transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-1.5 font-display">
                KIVO
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-kivo-cyan animate-pulse" />
              </span>
            </div>
          </a>

          {/* Center: Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] backdrop-blur-md">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleScrollTo(e, link.href)}
                className="relative group text-sm font-medium text-slate-300 hover:text-white px-3.5 py-1.5 rounded-full hover:bg-white/[0.06] transition-all duration-200"
              >
                <span>{link.name}</span>
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-[2px] w-0 bg-gradient-to-r from-kivo-blue via-kivo-cyan to-kivo-purple transition-all duration-300 group-hover:w-3/5 rounded-full opacity-0 group-hover:opacity-100" />
              </a>
            ))}
          </nav>

          {/* Right: Support, Track Ticket, Updates, Account & Download CTA */}
          <div className="hidden md:flex items-center gap-2 lg:gap-3">
            <a
              href="/track-ticket"
              onClick={(e) => {
                e.preventDefault();
                if (onNavigate) onNavigate('/track-ticket');
                else window.location.href = '/track-ticket';
              }}
              className="text-xs font-semibold text-kivo-cyan hover:text-white px-3 py-1.5 rounded-full hover:bg-white/[0.06] border border-kivo-cyan/30 hover:border-kivo-cyan/60 transition-colors flex items-center gap-1.5"
            >
              <LifeBuoy className="w-3.5 h-3.5" />
              <span>Track Ticket</span>
            </a>

            {onOpenSupport && (
              <button
                type="button"
                onClick={onOpenSupport}
                className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-full hover:bg-white/[0.06] border border-transparent hover:border-white/10 transition-colors"
              >
                Support
              </button>
            )}

            <a
              href="/updates"
              onClick={(e) => {
                e.preventDefault();
                if (onNavigate) onNavigate('/updates');
                else window.location.href = '/updates';
              }}
              className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-full hover:bg-white/[0.06] border border-transparent hover:border-white/10 transition-colors"
            >
              Updates
            </a>

            <MagneticButton strength={0.15}>
              <a
                href="#download"
                onClick={(e) => handleScrollTo(e, '#download')}
                className="relative group overflow-hidden rounded-full p-[1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-kivo-cyan block"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-kivo-blue via-kivo-cyan to-kivo-purple animate-gradient-x opacity-90 group-hover:opacity-100 transition-opacity" />
                <span className="relative flex items-center gap-2 px-4 py-2 rounded-full bg-kivo-bg text-xs font-semibold text-white transition-all duration-300 group-hover:bg-opacity-0">
                  <Download className="w-3.5 h-3.5 text-kivo-cyan group-hover:text-white transition-colors" />
                  <span>Download</span>
                </span>
              </a>
            </MagneticButton>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <a
              href="#download"
              onClick={(e) => handleScrollTo(e, '#download')}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-full bg-gradient-to-r from-kivo-blue to-kivo-purple text-white shadow-sm"
            >
              Download
            </a>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              type="button"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-kivo-cyan"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="md:hidden border-b border-white/[0.08] bg-kivo-bg/95 backdrop-blur-2xl overflow-hidden"
          >
            <div className="px-5 pt-3 pb-6 space-y-2">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => handleScrollTo(e, link.href)}
                  className="block px-4 py-2.5 rounded-xl text-base font-medium text-slate-200 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  {link.name}
                </a>
              ))}
              <a
                href="/track-ticket"
                onClick={(e) => {
                  e.preventDefault();
                  setMobileMenuOpen(false);
                  if (onNavigate) onNavigate('/track-ticket');
                  else window.location.href = '/track-ticket';
                }}
                className="block px-4 py-2.5 rounded-xl text-base font-medium text-kivo-cyan hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                Track Support Ticket
              </a>

              <a
                href="/updates"
                onClick={(e) => {
                  e.preventDefault();
                  setMobileMenuOpen(false);
                  if (onNavigate) onNavigate('/updates');
                  else window.location.href = '/updates';
                }}
                className="block px-4 py-2.5 rounded-xl text-base font-medium text-slate-200 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                Browser Updates & Notes
              </a>

              {onOpenSupport && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenSupport();
                  }}
                  className="block w-full text-left px-4 py-2.5 rounded-xl text-base font-medium text-slate-200 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  Contact & Support
                </button>
              )}
              <div className="pt-3 border-t border-white/[0.08]">
                <a
                  href="#download"
                  onClick={(e) => handleScrollTo(e, '#download')}
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-kivo-blue via-kivo-cyan to-kivo-purple font-semibold text-white shadow-lg shadow-kivo-blue/20"
                >
                  <Download className="w-4 h-4" />
                  <span>Download KIVO</span>
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
