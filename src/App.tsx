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
import { CeoSection } from './components/CeoSection';
import { CeoBottomSection } from './components/CeoBottomSection';
import { Footer } from './components/Footer';
import { LegalModal, type LegalTab } from './components/LegalModal';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { EarlyAccessModal } from './components/EarlyAccessModal';
import { SupportModal } from './components/SupportModal';
import { TicketTrackingPortal } from './components/TicketTrackingPortal';
import { UpdateCenter } from './components/UpdateCenter';
import { AnnouncementBanner } from './components/AnnouncementBanner';
import { AdminPanel } from './components/AdminPanel';
import { CmsProvider } from './context/CmsContext';

export function App() {
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' ? !navigator.onLine : false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
  const [legalModalTab, setLegalModalTab] = useState<LegalTab>('privacy');
  const [cookiePreferencesOpen, setCookiePreferencesOpen] = useState(false);

  const [earlyAccessOpen, setEarlyAccessOpen] = useState(false);
  const [earlyAccessPlatform, setEarlyAccessPlatform] = useState<'windows' | 'macos' | 'android'>('android');

  const [supportModalOpen, setSupportModalOpen] = useState(false);

  const handleOpenLegal = (tab: LegalTab) => {
    setLegalModalTab(tab);
    setLegalModalOpen(true);
  };

  const handleOpenEarlyAccess = (platform: 'windows' | 'macos' | 'android') => {
    setEarlyAccessPlatform(platform);
    setEarlyAccessOpen(true);
  };

  const handleOpenSupport = () => {
    setSupportModalOpen(true);
  };

  // 1. Admin route: dedicated administrative control plane
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

  // 2. Public Track Ticket route: /track-ticket (and legacy /support)
  if (currentPath.startsWith('/track-ticket') || currentPath.startsWith('/support')) {
    return (
      <MotionConfig reducedMotion="user">
        <div className="min-h-screen bg-kivo-bg text-slate-100 selection:bg-kivo-blue/30 selection:text-white font-sans">
          <CustomCursor />
          <TicketTrackingPortal onNavigateHome={() => navigateTo('/')} />
        </div>
      </MotionConfig>
    );
  }

  // 3. KIVO Update Center route: /updates
  if (currentPath.startsWith('/updates')) {
    return (
      <MotionConfig reducedMotion="user">
        <div className="min-h-screen bg-kivo-bg text-slate-100 selection:bg-kivo-blue/30 selection:text-white font-sans">
          <CustomCursor />
          <UpdateCenter onNavigateHome={() => navigateTo('/')} />
        </div>
      </MotionConfig>
    );
  }

  // Otherwise render the full, preserved KIVO Browser website
  return (
    <CmsProvider>
      <MotionConfig reducedMotion="user">
        <div className="min-h-screen bg-kivo-bg text-slate-100 selection:bg-kivo-blue/30 selection:text-white flex flex-col font-sans">
          {/* Custom Premium KIVO Mouse Cursor */}
          <CustomCursor />

          {/* Optional Announcement / Maintenance Banner from CMS */}
          <AnnouncementBanner />

          {/* Sticky Navbar */}
          <Navbar
            onOpenLegal={handleOpenLegal}
            onOpenSupport={handleOpenSupport}
            onNavigate={navigateTo}
          />

          {/* Main Landing Page Sections */}
          <main className="flex-grow">
            {/* Section 4: Hero */}
            <Hero />

            {/* Section: About the CEO & Co-Founder (Top Section) */}
            <CeoSection />

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

            {/* Section: Meet Our CEO & Co-Founder (Bottom Section) */}
            <CeoBottomSection />
          </main>

          {/* Section 10: Footer */}
          <Footer
            onOpenLegal={handleOpenLegal}
            onOpenSupport={handleOpenSupport}
            onOpenCookiePreferences={() => setCookiePreferencesOpen(true)}
          />

          {/* Interactive Cookie & Privacy Consent Banner */}
          <CookieConsentBanner
            isOpen={cookiePreferencesOpen}
            onClose={() => setCookiePreferencesOpen(false)}
            onOpenCookiePolicy={() => handleOpenLegal('cookies')}
          />

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

          <SupportModal
            isOpen={supportModalOpen}
            onClose={() => setSupportModalOpen(false)}
            onNavigateTrack={(ticketId) => navigateTo(`/track-ticket?ticketId=${encodeURIComponent(ticketId)}`)}
          />

          {/* Offline Mode Indicator */}
          {isOffline && (
            <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-900/95 border border-amber-500/40 text-amber-300 text-xs font-medium backdrop-blur-md shadow-2xl animate-fade-in pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>⚡ Offline Mode — KIVO running from local cache</span>
            </div>
          )}
        </div>
      </MotionConfig>
    </CmsProvider>
  );
}

export default App;
