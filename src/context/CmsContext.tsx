import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { CmsContent } from '../types/cms';

export const DEFAULT_CMS_FRONTEND: CmsContent = {
  hero: {
    badge: 'Next-Generation Web Browser',
    title: 'The AI-Powered Browser Built for Speed, Privacy & Power',
    subtitle:
      'KIVO Browser reimagines your daily web experience with built-in intelligent workspace tools, zero tracking, memory-efficient sandboxing, and instant downloads for all desktop platforms.',
    primaryCtaText: 'Download KIVO Free',
    primaryCtaLink: '#download',
    secondaryCtaText: 'Explore Features',
    secondaryCtaLink: '#features',
    heroImage: '/src/assets/hero.png',
  },
  navigation: {
    logoText: 'KIVO',
    navLinks: [
      { label: 'Features', href: '#features', isVisible: true },
      { label: 'Privacy', href: '#privacy', isVisible: true },
      { label: 'Showcase', href: '#showcase', isVisible: true },
      { label: 'About', href: '#about', isVisible: true },
      { label: 'Leadership', href: '#ceo', isVisible: true },
      { label: 'Download', href: '#download', isVisible: true },
    ],
    ctaText: 'Get KIVO Free',
    ctaLink: '#download',
  },
  features: {
    sectionTitle: 'Engineered for Performance and Control',
    sectionSubtitle:
      'Every layer of KIVO Browser is built from the ground up to deliver uncompromising speed, airtight privacy, and effortless productivity.',
    items: [
      {
        id: 'feat-1',
        title: 'Ultra-Fast Chromium Core',
        description:
          'Heavily optimized rendering engine with memory-compact tab isolation and hardware-accelerated graphics.',
        icon: 'Zap',
        isVisible: true,
      },
      {
        id: 'feat-2',
        title: 'Zero-Telemetry Shield',
        description:
          'Blocks fingerprinting, third-party trackers, invasive scripts, and telemetric data collection by default.',
        icon: 'Shield',
        isVisible: true,
      },
      {
        id: 'feat-3',
        title: 'Intelligent AI Workspace',
        description:
          'Context-aware sidebar AI assistance for instant page summarization, smart research, and coding workflows.',
        icon: 'Sparkles',
        isVisible: true,
      },
      {
        id: 'feat-4',
        title: 'Native Cross-Platform',
        description:
          'Tailored binaries for Windows 64-bit, macOS Apple Silicon (ARM64), and macOS Intel (x64) with native OS integrations.',
        icon: 'Cpu',
        isVisible: true,
      },
      {
        id: 'feat-5',
        title: 'Low Memory Footprint',
        description:
          'Smart tab hibernation frees up to 60% of idle RAM while preserving your active workspace sessions.',
        icon: 'Layers',
        isVisible: true,
      },
      {
        id: 'feat-6',
        title: 'Built-in Ad & Threat Blocker',
        description:
          'Network-level ad-blocking, phishing defense, and malicious domain filters with real-time heuristic updates.',
        icon: 'Lock',
        isVisible: true,
      },
    ],
  },
  privacy: {
    sectionTitle: 'Privacy is Not a Feature. It is Our Core Architecture.',
    sectionSubtitle:
      'Your browsing history, cookies, and passwords belong exclusively on your hardware. KIVO never sells, aggregates, or monitors your personal activity.',
    badges: [
      {
        title: 'Zero Activity Logs',
        description: 'No browsing histories, search queries, or IP logs are ever sent to remote servers.',
        icon: 'EyeOff',
      },
      {
        title: 'Hardware-Backed Encryption',
        description: 'Passwords and local session data protected by AES-GCM 256-bit encryption.',
        icon: 'Key',
      },
      {
        title: 'Tracker & Cookie Isolation',
        description: 'Third-party tracking cookies are strictly partitioned and purged upon tab closure.',
        icon: 'Cookie',
      },
    ],
  },
  showcase: {
    title: 'Designed for Power Users and Everyday Explorers',
    subtitle:
      'A streamlined interface that disappears when you need focus, and surfaces intelligent controls exactly when you need them.',
    tabs: [
      { id: 'tab-1', title: 'Smart Tab Stacks', description: 'Group, color-code, and organize dozens of tabs with automatic memory suspension.' },
      { id: 'tab-2', title: 'Split Screen Multitasking', description: 'View two tabs simultaneously side-by-side without opening multiple OS windows.' },
      { id: 'tab-3', title: 'Command Palette', description: 'Press Ctrl+K / Cmd+K to jump to any tab, search history, or trigger browser tools instantly.' },
    ],
  },
  about: {
    heading: 'About KIVO Browser',
    paragraph1:
      'KIVO Browser was born out of the conviction that modern web browsers have become cluttered, bloated with background trackers, and careless with computer resources. Our mission is to restore simplicity, blistering speed, and absolute user autonomy to the web.',
    paragraph2:
      'Engineered by a passionate team of systems architects and frontend specialists, KIVO is designed for developers, creators, researchers, and everyday users who demand privacy without compromising on capability or ecosystem compatibility.',
    missionTitle: 'Our Mission',
    missionText:
      'To build the fastest, most private, and user-centric web browser in the world, empowering individuals with complete digital sovereignty.',
    visionTitle: 'Our Vision',
    visionText:
      'A transparent web ecosystem where privacy is standard, AI tools serve the user directly, and digital tools elevate human potential.',
  },
  ceo: {
    isVisible: true,
    name: 'Shaurya Sharma',
    designation: 'CEO & Co-Founder of KIVO Browser',
    heading: 'About the CEO & Co-Founder',
    education: 'B.Tech in Electronics & Communication Engineering (AI & ML) • Gautam Buddha University',
    bio:
      'Shaurya Sharma is the CEO and Co-Founder of KIVO Browser, leading its overarching vision, technical architecture, and product innovation. Combining deep expertise in Artificial Intelligence, Machine Learning, IoT systems, and high-performance frontend engineering, Shaurya spearheads the design of KIVO to be blazingly fast, deeply private, and intuitively empowering.',
    expertise: [
      'Artificial Intelligence & Machine Learning',
      'High-Performance Frontend Architecture',
      'IoT Systems & Embedded Interfacing',
      'Product Innovation & User Experience',
      'Executive Leadership & Strategy',
    ],
    social: {
      linkedin: 'https://linkedin.com',
      twitter: 'https://twitter.com',
      github: 'https://github.com/mrshauryasharma',
      email: 'shaurya@kivobrowser.com',
    },
    quote:
      '“Our guiding mission with KIVO is simple: put the user back in complete command of their digital experience with unprecedented speed and uncompromising privacy.”',
    leadershipPrinciples: [
      {
        title: 'User Sovereignty First',
        description: 'Every architectural decision prioritizes individual security, local control, and zero data exploitation.',
      },
      {
        title: 'Relentless Performance',
        description: 'Micro-optimizations across graphics rendering, memory usage, and execution loops to make every millisecond count.',
      },
      {
        title: 'Thoughtful AI Integration',
        description: 'Leveraging AI not as intrusive gimmicks, but as seamless augmentations that save valuable hours every day.',
      },
    ],
  },
  downloads: {
    sectionTitle: 'Download KIVO for Desktop',
    sectionSubtitle:
      'Experience next-generation speed on your operating system. Official installer binaries packaged with SHA-256 integrity checks.',
    platforms: [
      {
        id: 'windows',
        name: 'Windows Desktop',
        arch: '64-bit (x64)',
        badge: 'Official Release (.exe)',
        description: 'Optimized for Windows 10 & 11 with DirectX 12 hardware acceleration.',
        requirements: 'Windows 10/11 64-bit • 4 GB RAM',
      },
      {
        id: 'mac-arm64',
        name: 'macOS Apple Silicon',
        arch: 'Apple Silicon (M1/M2/M3/M4)',
        badge: 'Universal DMG',
        description: 'Native ARM64 architecture with zero Rosetta overhead and extreme power efficiency.',
        requirements: 'macOS 12.0 Monterey or later • Apple Silicon',
      },
      {
        id: 'mac-intel',
        name: 'macOS Intel',
        arch: 'Intel 64-bit (x64)',
        badge: 'Universal DMG',
        description: 'Tailored for Intel-based Macs with Metal graphics optimization.',
        requirements: 'macOS 12.0 Monterey or later • Intel Core i5/i7/i9',
      },
    ],
  },
  footer: {
    tagline: 'The AI-Powered Browser Built for Speed, Privacy & Power.',
    copyright: '© 2026 KIVO Browser. All rights reserved.',
    contactEmail: 'contact@kivobrowser.com',
    links: [
      { label: 'Privacy Policy', href: '#privacy-policy' },
      { label: 'Terms of Service', href: '#terms-of-service' },
      { label: 'Contact Support', href: '#support' },
      { label: 'Release Notes', href: '#releases' },
    ],
  },
  contact: {
    supportEmail: 'support@kivobrowser.com',
    businessEmail: 'contact@kivobrowser.com',
    officeAddress: 'KIVO Browser Labs, New Delhi, India',
    supportHours: 'Monday – Saturday: 9:00 AM – 7:00 PM IST',
    phone: '+91 98765 43210',
  },
  seo: {
    metaTitle: 'KIVO Browser — The AI-Powered Browser Built for Speed, Privacy & Power',
    metaDescription:
      'Official website of KIVO Browser. Download free for Windows 64-bit, macOS Apple Silicon and Intel. Zero telemetry, memory efficiency, and AI workspace.',
    metaKeywords: 'KIVO Browser, private browser, fast browser, AI browser, Windows download, macOS ARM64',
  },
  announcement: {
    isEnabled: false,
    type: 'info',
    message: 'Welcome to KIVO Browser v1.0! Experience lightning-fast browsing.',
    actionText: 'Download Now',
    actionLink: '#download',
    dismissible: true,
  },
};

interface CmsContextValue {
  content: CmsContent;
  isLoading: boolean;
  refreshCms: () => Promise<void>;
}

const CmsContext = createContext<CmsContextValue>({
  content: DEFAULT_CMS_FRONTEND,
  isLoading: false,
  refreshCms: async () => {},
});

export const CmsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [content, setContent] = useState<CmsContent>(DEFAULT_CMS_FRONTEND);
  const [isLoading, setIsLoading] = useState(true);

  const fetchContent = useCallback(async () => {
    try {
      const res = await fetch('/api/content');
      if (res.ok) {
        const data = await res.json();
        if (data && data.content) {
          setContent((prev) => ({
            ...prev,
            ...data.content,
            hero: { ...prev.hero, ...data.content.hero },
            navigation: { ...prev.navigation, ...data.content.navigation },
            features: { ...prev.features, ...data.content.features },
            privacy: { ...prev.privacy, ...data.content.privacy },
            showcase: { ...prev.showcase, ...data.content.showcase },
            about: { ...prev.about, ...data.content.about },
            ceo: { ...prev.ceo, ...data.content.ceo },
            downloads: { ...prev.downloads, ...data.content.downloads },
            footer: { ...prev.footer, ...data.content.footer },
            contact: { ...prev.contact, ...data.content.contact },
            seo: { ...prev.seo, ...data.content.seo },
            announcement: { ...prev.announcement, ...data.content.announcement },
          }));
        }
      }
    } catch {
      // Fallback silently to default
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  return (
    <CmsContext.Provider value={{ content, isLoading, refreshCms: fetchContent }}>
      {children}
    </CmsContext.Provider>
  );
};

export function useCms() {
  return useContext(CmsContext);
}
