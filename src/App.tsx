import { useState, useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import { CustomCursor } from './components/CustomCursor';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { PrivacySection } from './components/PrivacySection';
import { BrowserShowcase } from './components/BrowserShowcase';
import { AboutSection } from './components/AboutSection';
import { DownloadSection } from './components/DownloadSection';
import { Footer } from './components/Footer';
import { LegalModal } from './components/LegalModal';
import { EarlyAccessModal } from './components/EarlyAccessModal';
import { AdminPanel } from './components/AdminPanel';

export function App() {
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);

  // Listen for browser navigation (back/forward) and custom navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'privacy' | 'terms'>('privacy');

  const [earlyAccessOpen, setEarlyAccessOpen] = useState(false);
  const [earlyAccessPlatform, setEarlyAccessPlatform] = useState<'windows' | 'macos'>('windows');

  const handleOpenLegal = (tab: 'privacy' | 'terms') => {
    setLegalModalTab(tab);
    setLegalModalOpen(true);
  };

  const handleOpenEarlyAccess = (platform: 'windows' | 'macos') => {
    setEarlyAccessPlatform(platform);
    setEarlyAccessOpen(true);
  };

  // If on admin route, render dedicated admin portal
  if (currentPath.startsWith('/kivoadmin')) {
    return (
      <MotionConfig reducedMotion="user">
        <div className="min-h-screen bg-kivo-bg text-slate-100 selection:bg-kivo-blue/30 selection:text-white font-sans">
          <CustomCursor />
          <AdminPanel onNavigateHome={() => navigateTo('/')} />
        </div>
      </MotionConfig>
    );
  }

  // Otherwise render the full, preserved KIVO Browser website
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-kivo-bg text-slate-100 selection:bg-kivo-blue/30 selection:text-white flex flex-col font-sans">
        {/* Custom Premium KIVO Mouse Cursor */}
        <CustomCursor />

        {/* Sticky Navbar */}
        <Navbar onOpenLegal={handleOpenLegal} />

        {/* Main Landing Page Sections */}
        <main className="flex-grow">
          {/* Section 4: Hero */}
          <Hero />

          {/* Section 5: Features */}
          <Features />

          {/* Section 6: Privacy */}
          <PrivacySection />

          {/* Section 7: Browser Showcase */}
          <BrowserShowcase />

          {/* Section 9: About */}
          <AboutSection />

          {/* Section 8: Download */}
          <DownloadSection onOpenEarlyAccess={handleOpenEarlyAccess} />
        </main>

        {/* Section 10: Footer */}
        <Footer onOpenLegal={handleOpenLegal} />

        {/* Interactive Modals */}
        <LegalModal
          key={`${legalModalTab}-${legalModalOpen}`}
          isOpen={legalModalOpen}
          initialTab={legalModalTab}
          onClose={() => setLegalModalOpen(false)}
        />

        <EarlyAccessModal
          isOpen={earlyAccessOpen}
          platform={earlyAccessPlatform}
          onClose={() => setEarlyAccessOpen(false)}
        />
      </div>
    </MotionConfig>
  );
}

export default App;
