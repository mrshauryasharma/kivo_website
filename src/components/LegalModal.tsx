import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, FileText, Cookie, Award, ShieldAlert, CheckCircle2 } from 'lucide-react';
import logoImg from '../assets/kivo-logo.png';

export type LegalTab = 'privacy' | 'terms' | 'cookies' | 'license' | 'security';

interface LegalModalProps {
  isOpen: boolean;
  initialTab?: LegalTab;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  initialTab = 'privacy',
  onClose,
}) => {
  const [tab, setTab] = React.useState<LegalTab>(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-4xl rounded-3xl bg-[#090D18] border border-white/[0.12] shadow-2xl p-5 sm:p-8 z-10 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-5 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <img src={logoImg} alt="KIVO" className="w-9 h-9 object-contain" />
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white font-display">
                  KIVO Legal, Security & Compliance Portal
                </h3>
                <p className="text-xs text-slate-400">
                  Official terms and policies for KIVO Browser & Services (2026 Edition)
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              type="button"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2 pt-4 pb-2 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setTab('privacy')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                tab === 'privacy'
                  ? 'bg-kivo-blue text-white shadow-md shadow-kivo-blue/20'
                  : 'bg-white/[0.04] text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Privacy Policy</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('terms')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                tab === 'terms'
                  ? 'bg-kivo-purple text-white shadow-md shadow-kivo-purple/20'
                  : 'bg-white/[0.04] text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Terms of Service</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('cookies')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                tab === 'cookies'
                  ? 'bg-amber-500/90 text-white shadow-md shadow-amber-500/20'
                  : 'bg-white/[0.04] text-slate-400 hover:text-white'
              }`}
            >
              <Cookie className="w-4 h-4" />
              <span>Cookie Policy</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('license')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                tab === 'license'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-white/[0.04] text-slate-400 hover:text-white'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Software License (EULA)</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('security')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                tab === 'security'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                  : 'bg-white/[0.04] text-slate-400 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Security & Disclosure</span>
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="overflow-y-auto pr-2 mt-4 space-y-6 text-xs sm:text-sm text-slate-300 leading-relaxed max-h-[58vh]">
            
            {/* TAB 1: PRIVACY POLICY */}
            {tab === 'privacy' && (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-kivo-blue/10 border border-kivo-blue/20">
                  <div className="flex items-center gap-2 text-kivo-cyan font-semibold text-sm mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Zero Data Selling & Sovereign Privacy</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-normal">
                    KIVO does not collect, record, profile, or sell your personal browsing habits. You are the sole sovereign owner of your browsing experience.
                  </p>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white mb-1.5 font-display">
                    1. Our Core Principle: Zero Behavioral Surveillance
                  </h4>
                  <p className="text-slate-400">
                    KIVO is architected with a strict privacy-first foundation. We do not track, profile, monetize, or harvest your browsing history, typed search queries, downloaded files, or session activities.
                  </p>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white mb-1.5 font-display">
                    2. Local Data Storage & Credentials
                  </h4>
                  <p className="text-slate-400">
                    All browser configuration data, bookmarks, local saved passwords, and browsing profiles are stored locally on your desktop or mobile machine in your secure user directory. KIVO does not upload your sensitive credentials to remote cloud repositories without your active, explicit configuration.
                  </p>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white mb-1.5 font-display">
                    3. Client-Side Network Filtering & Shields
                  </h4>
                  <p className="text-slate-400">
                    The KIVO Shield ad-blocking and privacy engine processes network filters entirely client-side on your device's CPU. URL match rules are evaluated locally without ever sending visited URLs to remote inspection servers.
                  </p>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white mb-1.5 font-display">
                    4. Crash Reporting and Software Updates
                  </h4>
                  <p className="text-slate-400">
                    When checking for software updates, KIVO transmits only your current client version and OS platform architecture to verify whether an updated binary exists. No personally identifiable tracking ID, hardware fingerprint, or location data is ever appended.
                  </p>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white mb-1.5 font-display">
                    5. Customer Support & Communication
                  </h4>
                  <p className="text-slate-400">
                    When you voluntarily submit a support ticket or request release notifications, we collect your email address, mobile number (for 2FA/ticket OTP verification), and problem description solely to fulfill that service request. Support data is never shared with third-party marketing entities.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: TERMS OF SERVICE */}
            {tab === 'terms' && (
              <div className="space-y-5">
                <div>
                  <h4 className="text-base font-bold text-white mb-1.5 font-display">
                    1. Acceptance of Terms
                  </h4>
                  <p className="text-slate-400">
                    By downloading, installing, or using the KIVO Browser application (for Windows, macOS, or Android) or accessing this website, you agree to these Terms of Service. If you do not agree, you must discontinue using our services immediately.
                  </p>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white mb-1.5 font-display">
                    2. Permitted Use
                  </h4>
                  <p className="text-slate-400">
                    KIVO is provided for personal and professional web browsing on supported operating systems. You may not reverse engineer, tamper with security integrity mechanisms, or re-distribute compromised binaries disguised under the KIVO trademark.
                  </p>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white mb-1.5 font-display">
                    3. Prohibited Activities
                  </h4>
                  <p className="text-slate-400">
                    You agree not to use KIVO or our web infrastructure to engage in unlawful activities, distribute malware, initiate denial-of-service attacks, attempt unauthorized administrative access, or exploit website vulnerabilities.
                  </p>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white mb-1.5 font-display">
                    4. Disclaimer of Warranties
                  </h4>
                  <p className="text-slate-400">
                    KIVO Browser and its accompanying software releases are provided &ldquo;as is&rdquo; without warranties of any kind, either express or implied. While we strive for optimal stability, safety, and security, you use the software at your discretion.
                  </p>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white mb-1.5 font-display">
                    5. Copyright and Trademark
                  </h4>
                  <p className="text-slate-400">
                    &ldquo;KIVO&rdquo;, the KIVO logo, and associated visual design elements are proprietary trademarks owned by KIVO Browser Technologies and Shaurya Sharma. All other trademarks, platform logos (Windows, Apple, Android), and third-party references remain the property of their respective owners.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: COOKIE POLICY */}
            {tab === 'cookies' && (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm mb-1">
                    <Cookie className="w-4 h-4" />
                    <span>Transparent & Respectful Cookie Use</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-normal">
                    KIVO uses only first-party, essential cookies strictly required for security, session authentication, and anti-CSRF protection. We never embed third-party advertising or cross-site tracking cookies.
                  </p>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white mb-1.5 font-display">
                    1. What Cookies Does KIVO Use?
                  </h4>
                  <p className="text-slate-400 mb-3">
                    Below is an exhaustive inventory of the first-party cookies utilized on this platform:
                  </p>

                  <div className="space-y-2.5">
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="flex items-center justify-between text-xs font-semibold text-white mb-1">
                        <span className="font-mono text-kivo-cyan">kivo_admin_session</span>
                        <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">Essential (Admin)</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Purpose: Stores signed, encrypted administrative authentication token. Expiry: 8 Hours. Attributes: HttpOnly, Secure, SameSite=Lax.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="flex items-center justify-between text-xs font-semibold text-white mb-1">
                        <span className="font-mono text-kivo-purple">kivo_csrf_token</span>
                        <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">Security (Anti-CSRF)</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Purpose: Cryptographic token defending all data mutations against Cross-Site Request Forgery attacks. Expiry: 8 Hours. Attributes: SameSite=Lax.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="flex items-center justify-between text-xs font-semibold text-white mb-1">
                        <span className="font-mono text-amber-300">kivo_consent_status</span>
                        <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-white/[0.08] text-slate-300">Functional</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Purpose: Remembers whether you chose "Accept All" or "Essential Only" in the cookie banner. Expiry: 1 Year. Attributes: SameSite=Lax.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white mb-1.5 font-display">
                    2. No Third-Party Tracking or Ad Networks
                  </h4>
                  <p className="text-slate-400">
                    We deliberately do not include Google Analytics, Facebook Pixel, TikTok SDK, or third-party ad networks. We believe your web browsing belongs to you, not data brokers.
                  </p>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white mb-1.5 font-display">
                    3. Managing & Deleting Cookies
                  </h4>
                  <p className="text-slate-400">
                    You can adjust or revoke your cookie choices at any time via the "Cookie Settings" link in our website footer. You can also delete or block cookies through your browser settings.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 4: SOFTWARE LICENSE (EULA) */}
            {tab === 'license' && (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-emerald-600/10 border border-emerald-600/20">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm mb-1">
                    <Award className="w-4 h-4" />
                    <span>Official KIVO Software License & EULA</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-normal">
                    Copyright &copy; 2026 KIVO Browser Technologies &amp; Shaurya Sharma. All rights reserved. Licensed for personal, academic, and enterprise desktop/mobile usage.
                  </p>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white mb-1.5 font-display">
                    1. License Grant
                  </h4>
                  <p className="text-slate-400">
                    KIVO Browser grants you a personal, worldwide, non-exclusive, non-transferable, revocable license to install and execute the KIVO Browser application on compatible Windows (x64), macOS (Apple Silicon &amp; Intel), and Android (ARM64/Universal) devices.
                  </p>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white mb-1.5 font-display">
                    2. Distribution & Integrity
                  </h4>
                  <p className="text-slate-400">
                    Official installers must only be obtained from our authenticated download portal at <span className="text-kivo-cyan">kivobrowser.c37.airoapp.ai</span> or verified GitHub releases. Every official build is signed with SHA-256 cryptographic verification checksums to protect against malicious supply-chain alterations.
                  </p>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white mb-1.5 font-display">
                    3. Open Source Components & Attributions
                  </h4>
                  <p className="text-slate-400">
                    KIVO utilizes and contributes to the broader open-source ecosystem. Underlying engine modules, rendering stacks, and web libraries include components licensed under the Chromium project, MIT License, Apache License 2.0, and BSD licenses. Complete license attributions and source notices are maintained within the application documentation.
                  </p>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white mb-1.5 font-display">
                    4. Termination
                  </h4>
                  <p className="text-slate-400">
                    This license is effective until terminated. Your rights under this license will terminate automatically without notice if you fail to comply with any of its terms.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 5: SECURITY & RESPONSIBLE DISCLOSURE */}
            {tab === 'security' && (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-rose-600/10 border border-rose-600/20">
                  <div className="flex items-center gap-2 text-rose-300 font-semibold text-sm mb-1">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Security & Vulnerability Disclosure Program</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-normal">
                    We maintain an open and proactive security posture. If you believe you have discovered a security vulnerability in KIVO Browser or our website, we invite you to report it safely.
                  </p>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white mb-1.5 font-display">
                    1. RFC 9116 Compliant Security Disclosure
                  </h4>
                  <p className="text-slate-400">
                    Our machine-readable security policy is published at <span className="font-mono text-kivo-cyan">/.well-known/security.txt</span>. You may report security concerns directly via our dedicated customer support portal or email <span className="text-white font-medium">support@kivobrowser.com</span>.
                  </p>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white mb-1.5 font-display">
                    2. Safe Harbor Commitment
                  </h4>
                  <p className="text-slate-400">
                    We consider activities conducted consistent with this policy to be "authorized" conduct. We will not pursue legal action against researchers who test within scope, avoid privacy violations, do not degrade production availability, and disclose findings to us before public revelation.
                  </p>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white mb-1.5 font-display">
                    3. Response Timelines & SLA
                  </h4>
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
                    <li><strong className="text-white">Initial Acknowledgment:</strong> Within 24 hours of receiving your report.</li>
                    <li><strong className="text-white">Triage & Verification:</strong> Within 72 hours with an assigned severity rating.</li>
                    <li><strong className="text-white">Remediation & Patch:</strong> Critical security issues patched within 7 calendar days.</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white mb-1.5 font-display">
                    4. Out of Scope
                  </h4>
                  <p className="text-slate-400">
                    Denial of Service (DoS/DDoS) attacks, social engineering, automated credential stuffing, and spamming our support forms are strictly out of scope and prohibited.
                  </p>
                </div>
              </div>
            )}

          </div>

          {/* Footer note */}
          <div className="pt-4 mt-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <span>Official Release: 2026 &bull; KIVO Browser Technologies &amp; Shaurya Sharma</span>
            <button
              onClick={onClose}
              type="button"
              className="px-5 py-2 rounded-xl bg-white/[0.08] text-white hover:bg-white/[0.12] font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
