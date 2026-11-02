import { useState } from 'react';
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

export function App() {
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
