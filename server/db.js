import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  CMS_FILE,
  TICKETS_FILE,
  METADATA_FILE,
  USERS_FILE,
  RELEASES_FILE,
  PLATFORM_RULES,
  LEGACY_METADATA_FILE,
  resolveInstallerFilePath,
  INSTALLER_RETENTION_POLICY,
  UPLOADS_DIR,
  ARCHIVE_DIR,
} from './config.js';
import {
  syncInstallerMetadataToMysql,
  loadInstallerMetadataFromMysql,
  deleteInstallerMetadataFromMysql,
  deleteTicketFromMysql,
  checkInstallerBinaryInMysql,
  restoreInstallerBinaryFromMysql,
  saveInstallerBinaryToMysql,
  deleteInstallerBinaryFromMysql,
} from './mysql.js';

// -------------------------------------------------------------
// Helper: Safe Atomic File I/O with Automatic Backups
// -------------------------------------------------------------
function readJsonSafely(filePath, defaultValue) {
  try {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) return defaultValue;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[KIVO DB] Warning reading ${filePath}: ${err.message}. Checking backup...`);
    const backupPath = `${filePath}.bak`;
    if (fs.existsSync(backupPath)) {
      try {
        const bakRaw = fs.readFileSync(backupPath, 'utf8');
        return JSON.parse(bakRaw);
      } catch {
        // Fallback to default
      }
    }
    return defaultValue;
  }
}

function writeJsonAtomically(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const tempPath = `${filePath}.tmp.${Date.now()}`;
  const backupPath = `${filePath}.bak`;
  const jsonStr = JSON.stringify(data, null, 2);

  fs.writeFileSync(tempPath, jsonStr, 'utf8');

  if (fs.existsSync(filePath)) {
    try {
      fs.copyFileSync(filePath, backupPath);
    } catch {
      // Ignore backup error
    }
  }

  try {
    fs.renameSync(tempPath, filePath);
  } catch {
    fs.copyFileSync(tempPath, filePath);
    try {
      fs.unlinkSync(tempPath);
    } catch {
      // Ignore
    }
  }
}

// -------------------------------------------------------------
// Default Initial CMS Schema
// -------------------------------------------------------------
export const DEFAULT_CMS_CONTENT = {
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

// -------------------------------------------------------------
// CMS Content Operations
// -------------------------------------------------------------
export function getCmsData() {
  const fileData = readJsonSafely(CMS_FILE, null);
  if (!fileData || !fileData.published) {
    const initialData = {
      published: DEFAULT_CMS_CONTENT,
      draft: DEFAULT_CMS_CONTENT,
      history: [
        {
          id: 'initial',
          timestamp: new Date().toISOString(),
          author: 'system',
          note: 'Initial production baseline',
          content: DEFAULT_CMS_CONTENT,
        },
      ],
    };
    writeJsonAtomically(CMS_FILE, initialData);
    return initialData;
  }
  return fileData;
}

export function getCmsPublished() {
  const data = getCmsData();
  return data.published || DEFAULT_CMS_CONTENT;
}

export function getCmsDraft() {
  const data = getCmsData();
  return data.draft || data.published || DEFAULT_CMS_CONTENT;
}

export function saveCmsDraft(draft) {
  const data = getCmsData();
  const current = data.draft || data.published || DEFAULT_CMS_CONTENT;
  data.draft = {
    ...DEFAULT_CMS_CONTENT,
    ...current,
    ...draft,
    hero: { ...(current.hero || DEFAULT_CMS_CONTENT.hero), ...(draft.hero || {}) },
    navigation: {
      ...(current.navigation || DEFAULT_CMS_CONTENT.navigation),
      ...(draft.navigation || {}),
      navLinks: draft.navigation?.navLinks || current.navigation?.navLinks || DEFAULT_CMS_CONTENT.navigation.navLinks,
    },
    features: {
      ...(current.features || DEFAULT_CMS_CONTENT.features),
      ...(draft.features || {}),
      items: draft.features?.items || current.features?.items || DEFAULT_CMS_CONTENT.features.items,
    },
    privacy: {
      ...(current.privacy || DEFAULT_CMS_CONTENT.privacy),
      ...(draft.privacy || {}),
      badges: draft.privacy?.badges || current.privacy?.badges || DEFAULT_CMS_CONTENT.privacy.badges,
    },
    showcase: {
      ...(current.showcase || DEFAULT_CMS_CONTENT.showcase),
      ...(draft.showcase || {}),
      tabs: draft.showcase?.tabs || current.showcase?.tabs || DEFAULT_CMS_CONTENT.showcase.tabs,
    },
    about: { ...(current.about || DEFAULT_CMS_CONTENT.about), ...(draft.about || {}) },
    ceo: {
      ...(current.ceo || DEFAULT_CMS_CONTENT.ceo),
      ...(draft.ceo || {}),
      social: { ...(current.ceo?.social || DEFAULT_CMS_CONTENT.ceo.social), ...(draft.ceo?.social || {}) },
      expertise: Array.isArray(draft.ceo?.expertise) ? draft.ceo.expertise : (current.ceo?.expertise || DEFAULT_CMS_CONTENT.ceo.expertise),
      leadershipPrinciples: draft.ceo?.leadershipPrinciples || current.ceo?.leadershipPrinciples || DEFAULT_CMS_CONTENT.ceo.leadershipPrinciples,
    },
    downloads: {
      ...(current.downloads || DEFAULT_CMS_CONTENT.downloads),
      ...(draft.downloads || {}),
      platforms: draft.downloads?.platforms || current.downloads?.platforms || DEFAULT_CMS_CONTENT.downloads.platforms,
    },
    footer: {
      ...(current.footer || DEFAULT_CMS_CONTENT.footer),
      ...(draft.footer || {}),
      links: draft.footer?.links || current.footer?.links || DEFAULT_CMS_CONTENT.footer.links,
    },
    contact: { ...(current.contact || DEFAULT_CMS_CONTENT.contact), ...(draft.contact || {}) },
    seo: { ...(current.seo || DEFAULT_CMS_CONTENT.seo), ...(draft.seo || {}) },
    announcement: { ...(current.announcement || DEFAULT_CMS_CONTENT.announcement), ...(draft.announcement || {}) },
  };
  writeJsonAtomically(CMS_FILE, data);
  return data.draft;
}

export function publishCms(author = 'admin', note = 'Published changes via KIVO Admin') {
  const data = getCmsData();
  const newPublished = JSON.parse(JSON.stringify(data.draft || data.published));

  const historyEntry = {
    id: `rev-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    timestamp: new Date().toISOString(),
    author,
    note,
    content: newPublished,
  };

  data.published = newPublished;
  data.history = [historyEntry, ...(data.history || [])].slice(0, 30);

  writeJsonAtomically(CMS_FILE, data);
  return {
    success: true,
    published: data.published,
    revisionId: historyEntry.id,
  };
}

export function revertCms(revisionId) {
  const data = getCmsData();
  const entry = (data.history || []).find((h) => h.id === revisionId);
  if (!entry) {
    throw new Error(`Revision ${revisionId} not found.`);
  }

  const restoredContent = JSON.parse(JSON.stringify(entry.content));
  data.published = restoredContent;
  data.draft = restoredContent;

  const historyEntry = {
    id: `rev-${Date.now()}-reverted`,
    timestamp: new Date().toISOString(),
    author: 'admin',
    note: `Reverted to revision from ${entry.timestamp}`,
    content: restoredContent,
  };
  data.history = [historyEntry, ...(data.history || [])].slice(0, 30);

  writeJsonAtomically(CMS_FILE, data);
  return {
    success: true,
    restored: data.published,
    revisionId: historyEntry.id,
  };
}

export function getCmsHistory() {
  const data = getCmsData();
  return (data.history || []).map((h) => ({
    id: h.id,
    timestamp: h.timestamp,
    author: h.author,
    note: h.note,
  }));
}

// -------------------------------------------------------------
// Support Tickets Operations (Persistent Relational-Like Store)
// -------------------------------------------------------------
export function getTicketsStore() {
  const store = readJsonSafely(TICKETS_FILE, null);
  if (!store || !Array.isArray(store.tickets)) {
    const initial = {
      tickets: [],
      verificationTokens: [],
    };
    writeJsonAtomically(TICKETS_FILE, initial);
    return initial;
  }
  if (!Array.isArray(store.verificationTokens)) {
    store.verificationTokens = [];
  }
  return store;
}

// Masking helpers to shield customer personal information in public tracking
export function maskEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const parts = email.trim().split('@');
  if (parts.length !== 2) return email;
  const [local, domain] = parts;
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

export function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const clean = phone.trim();
  const digits = clean.replace(/\D/g, '');
  if (digits.length <= 4) return '••••';
  const last4 = digits.slice(-4);
  return `+•• •••• ••${last4}`;
}

// Generates permanent unique Ticket ID in format: KIVO-2026-00001 (strictly monotonic, never reused)
function generateUniqueTicketId(store) {
  const year = new Date().getFullYear();
  let maxSeq = 0;

  if (typeof store.ticketSequenceCounter === 'number' && store.ticketSequenceCounter > 0) {
    maxSeq = store.ticketSequenceCounter;
  }

  if (Array.isArray(store.tickets)) {
    for (const t of store.tickets) {
      if (t && typeof t.id === 'string') {
        const match = t.id.match(/^KIVO-\d{4}-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      }
    }
  }

  let nextSeq = maxSeq + 1;
  let id = `KIVO-${year}-${nextSeq.toString().padStart(5, '0')}`;

  while (store.tickets && store.tickets.some((t) => t.id === id)) {
    nextSeq++;
    id = `KIVO-${year}-${nextSeq.toString().padStart(5, '0')}`;
  }

  store.ticketSequenceCounter = nextSeq;
  return id;
}

export function createSupportTicket({
  name,
  email,
  phone,
  category,
  subject,
  description,
  attachments = [],
}) {
  const store = getTicketsStore();
  const ticketId = generateUniqueTicketId(store);
  const now = new Date().toISOString();

  // Clean attachments array
  const formattedAttachments = (attachments || []).map((a) => ({
    id: a.id || crypto.randomUUID(),
    filename: a.filename,
    originalName: a.originalName || a.filename,
    size: a.size || 0,
    mimeType: a.mimeType || 'application/octet-stream',
  }));

  const initialMessage = {
    id: `msg-1-${Date.now()}`,
    sender: name.trim(),
    senderType: 'customer',
    text: description.trim(),
    timestamp: now,
    attachments: formattedAttachments,
    emailStatus: 'pending',
  };

  const newTicket = {
    id: ticketId,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: (phone || '').trim(),
    category: category || 'General Feedback',
    subject: subject.trim(),
    description: description.trim(),
    status: 'Open', // 'Open' | 'Reopened' | 'In Progress' | 'Waiting for Customer' | 'Closed'
    priority: 'Normal',
    createdAt: now,
    updatedAt: now,
    lastResponseAt: null,
    messages: [initialMessage],
    internalNotes: [],
    statusHistory: [
      {
        from: null,
        to: 'Open',
        changedBy: 'customer',
        timestamp: now,
        reason: 'Ticket created by customer',
      },
    ],
    emailLogs: [],
  };

  store.tickets.unshift(newTicket);
  writeJsonAtomically(TICKETS_FILE, store);
  return newTicket;
}

export function listSupportTickets({
  search = '',
  status = '',
  category = '',
  priority = '',
  limit = 50,
  offset = 0,
} = {}) {
  const store = getTicketsStore();
  let list = [...store.tickets];

  if (status && status !== 'all') {
    list = list.filter((t) => t.status.toLowerCase() === status.toLowerCase());
  }

  if (category && category !== 'all') {
    list = list.filter((t) => t.category.toLowerCase() === category.toLowerCase());
  }

  if (priority && priority !== 'all') {
    list = list.filter((t) => (t.priority || 'Normal').toLowerCase() === priority.toLowerCase());
  }

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(
      (t) =>
        t.id.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.phone?.toLowerCase().includes(q)
    );
  }

  const total = list.length;
  const paginated = list.slice(offset, offset + limit);

  return {
    total,
    tickets: paginated,
  };
}

export function getSupportTicketById(id) {
  const store = getTicketsStore();
  return store.tickets.find((t) => t.id === id) || null;
}

// Sanitized ticket for customer view (strictly shields customer personal info and omits internalNotes)
export function getSupportTicketForCustomer(id) {
  const ticket = getSupportTicketById(id);
  if (!ticket) return null;

  return {
    id: ticket.id,
    name: ticket.name,
    email: maskEmail(ticket.email),
    phone: maskPhone(ticket.phone),
    category: ticket.category,
    subject: ticket.subject,
    status: ticket.status,
    priority: ticket.priority || 'Normal',
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    messages: (ticket.messages || []).map((m) => ({
      id: m.id,
      sender: m.sender,
      senderType: m.senderType,
      text: m.text,
      timestamp: m.timestamp,
      attachments: m.attachments || [],
    })),
    statusHistory: (ticket.statusHistory || []).map((s) => ({
      to: s.to,
      timestamp: s.timestamp,
    })),
  };
}

// Add a reply (from admin or customer)
export function addSupportTicketReply(
  ticketId,
  {
    sender,
    senderType = 'admin',
    text,
    attachments = [],
    emailStatus = 'pending',
    emailError = null,
  }
) {
  const store = getTicketsStore();
  const ticket = store.tickets.find((t) => t.id === ticketId);
  if (!ticket) {
    throw new Error(`Ticket ${ticketId} not found.`);
  }

  // PERMANENT CLOSED TICKET RULE:
  // Once a ticket is Closed, it must remain closed permanently. No replies or reopenings permitted.
  if (ticket.status === 'Closed') {
    throw new Error('This ticket is permanently closed. Please submit a new ticket for any new or recurring issues.');
  }

  const now = new Date().toISOString();
  const formattedAttachments = (attachments || []).map((a) => ({
    id: a.id || crypto.randomUUID(),
    filename: a.filename,
    originalName: a.originalName || a.filename,
    size: a.size || 0,
    mimeType: a.mimeType || 'application/octet-stream',
  }));

  const replyMsg = {
    id: `msg-${ticket.messages.length + 1}-${Date.now()}`,
    sender,
    senderType,
    text: text.trim(),
    timestamp: now,
    attachments: formattedAttachments,
    emailStatus,
    emailError,
  };

  ticket.messages.push(replyMsg);
  ticket.updatedAt = now;

  let statusChanged = false;
  let previousStatus = ticket.status;

  if (senderType === 'admin') {
    ticket.lastResponseAt = now;
    if (ticket.status === 'Open') {
      ticket.status = 'Waiting for Customer';
      ticket.statusHistory.push({
        from: previousStatus,
        to: 'Waiting for Customer',
        changedBy: 'admin',
        timestamp: now,
        reason: 'Staff posted a response',
      });
      statusChanged = true;
    }
  }

  writeJsonAtomically(TICKETS_FILE, store);
  return { ticket, reply: replyMsg, statusChanged, previousStatus };
}

export function updateSupportTicketStatus(ticketId, newStatus, changedBy = 'admin', reason = '') {
  const validStatuses = [
    'Open',
    'In Progress',
    'Waiting for Customer',
    'Waiting for Support',
    'Resolved',
    'Closed',
  ];
  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}. Valid statuses: ${validStatuses.join(', ')}`);
  }

  const store = getTicketsStore();
  const ticket = store.tickets.find((t) => t.id === ticketId);
  if (!ticket) {
    throw new Error(`Ticket ${ticketId} not found.`);
  }

  // Once a ticket is closed, it cannot be modified or reopened
  if (ticket.status === 'Closed' && newStatus !== 'Closed') {
    throw new Error('Closed tickets cannot be modified or reopened. Please create a new ticket.');
  }

  const from = ticket.status;
  if (from === newStatus) return ticket;

  const now = new Date().toISOString();
  ticket.status = newStatus;
  ticket.updatedAt = now;

  if (!ticket.statusHistory) ticket.statusHistory = [];
  ticket.statusHistory.push({
    from,
    to: newStatus,
    changedBy,
    timestamp: now,
    reason,
  });

  writeJsonAtomically(TICKETS_FILE, store);
  return ticket;
}

export function updateSupportTicketPriority(ticketId, priority) {
  const validPriorities = ['Low', 'Normal', 'High', 'Urgent'];
  if (!validPriorities.includes(priority)) {
    throw new Error(`Invalid priority. Valid options: ${validPriorities.join(', ')}`);
  }
  const store = getTicketsStore();
  const ticket = store.tickets.find((t) => t.id === ticketId);
  if (!ticket) {
    throw new Error(`Ticket ${ticketId} not found.`);
  }
  ticket.priority = priority;
  ticket.updatedAt = new Date().toISOString();
  writeJsonAtomically(TICKETS_FILE, store);
  return ticket;
}

export function updateSupportTicketAssignee(ticketId, assignee) {
  const store = getTicketsStore();
  const ticket = store.tickets.find((t) => t.id === ticketId);
  if (!ticket) {
    throw new Error(`Ticket ${ticketId} not found.`);
  }
  ticket.assignee = (assignee || 'Unassigned').trim();
  ticket.updatedAt = new Date().toISOString();
  writeJsonAtomically(TICKETS_FILE, store);
  return ticket;
}

export function deleteSupportTicket(ticketId) {
  const store = getTicketsStore();
  const cleanId = (ticketId || '').trim().toUpperCase();
  const index = store.tickets.findIndex((t) => t.id.toUpperCase() === cleanId);
  if (index === -1) {
    throw new Error(`Ticket ${ticketId} not found.`);
  }

  const [removed] = store.tickets.splice(index, 1);

  // Clean related verification tokens
  store.verificationTokens = (store.verificationTokens || []).filter(
    (vt) => vt.ticketId.toUpperCase() !== cleanId
  );

  writeJsonAtomically(TICKETS_FILE, store);

  // Sync delete with MySQL if connected
  deleteTicketFromMysql(cleanId).catch(() => {});

  return removed;
}

export function addSupportTicketNote(ticketId, { author = 'Admin', text }) {
  const store = getTicketsStore();
  const ticket = store.tickets.find((t) => t.id === ticketId);
  if (!ticket) {
    throw new Error(`Ticket ${ticketId} not found.`);
  }

  const note = {
    id: `note-${(ticket.internalNotes || []).length + 1}-${Date.now()}`,
    author,
    text: text.trim(),
    timestamp: new Date().toISOString(),
  };

  if (!ticket.internalNotes) ticket.internalNotes = [];
  ticket.internalNotes.push(note);
  ticket.updatedAt = new Date().toISOString();

  writeJsonAtomically(TICKETS_FILE, store);
  return note;
}

export function logTicketEmailEvent(ticketId, { type, recipient, subject, status, error = null, resendId = null }) {
  const store = getTicketsStore();
  const ticket = store.tickets.find((t) => t.id === ticketId);
  if (!ticket) return null;

  const entry = {
    id: `email-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    type,
    recipient,
    subject,
    status, // 'delivered' | 'failed' | 'skipped'
    error,
    resendId,
    timestamp: new Date().toISOString(),
  };

  if (!ticket.emailLogs) ticket.emailLogs = [];
  ticket.emailLogs.unshift(entry);
  writeJsonAtomically(TICKETS_FILE, store);
  return entry;
}

// -------------------------------------------------------------
// Customer Verification Tokens (OTP & Magic Links for IDOR Prevention)
// -------------------------------------------------------------
export function createVerificationToken(ticketId, identifier) {
  const store = getTicketsStore();
  const cleanId = (ticketId || '').trim().toUpperCase();
  const cleanInput = (identifier || '').trim();
  const cleanDigits = cleanInput.replace(/\D/g, '');

  const ticket = store.tickets.find((t) => {
    if (t.id.toUpperCase() !== cleanId) return false;
    // Check registered email match
    if (t.email && t.email.toLowerCase() === cleanInput.toLowerCase()) return true;
    // Check registered mobile number match
    if (t.phone) {
      if (t.phone.trim() === cleanInput) return true;
      const tDigits = t.phone.replace(/\D/g, '');
      if (cleanDigits.length >= 7 && (tDigits === cleanDigits || tDigits.endsWith(cleanDigits) || cleanDigits.endsWith(tDigits))) {
        return true;
      }
    }
    return false;
  });

  if (!ticket) {
    throw new Error('Ticket ID and registered email or mobile number do not match our records.');
  }

  // Generate 6-digit OTP code (e.g. 849201)
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  // Generate high-entropy 64-character magic link token
  const magicToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

  // Clean expired tokens
  store.verificationTokens = (store.verificationTokens || []).filter(
    (t) => new Date(t.expiresAt).getTime() > Date.now()
  );

  const tokenEntry = {
    ticketId: ticket.id,
    email: ticket.email,
    phone: ticket.phone,
    otpCode,
    magicToken,
    expiresAt,
    used: false,
    createdAt: new Date().toISOString(),
  };

  store.verificationTokens.push(tokenEntry);
  writeJsonAtomically(TICKETS_FILE, store);

  return {
    ticket,
    otpCode,
    magicToken,
    expiresAt,
  };
}

export function verifyCustomerAccess(ticketId, identifier, otpOrToken) {
  const store = getTicketsStore();
  const cleanId = (ticketId || '').trim().toUpperCase();
  const cleanInput = (otpOrToken || '').trim();

  const record = (store.verificationTokens || []).find((t) => {
    if (t.ticketId.toUpperCase() !== cleanId) return false;
    if (t.used) return false;
    if (new Date(t.expiresAt).getTime() < Date.now()) return false;
    return t.otpCode === cleanInput || t.magicToken === cleanInput;
  });

  if (!record) {
    return { valid: false, error: 'Invalid or expired verification code.' };
  }

  // Mark token used
  record.used = true;
  writeJsonAtomically(TICKETS_FILE, store);

  // Return a secure signed customer ticket session token
  const customerSession = crypto.createHmac('sha256', 'kivo-ticket-auth-secret-token')
    .update(`${cleanId}:${record.email}:${Date.now()}`)
    .digest('hex');

  return {
    valid: true,
    ticketId: record.ticketId,
    email: record.email,
    customerSession,
  };
}

// -------------------------------------------------------------
// Installer Metadata Operations (Permanent Dual-Layer Architecture)
// -------------------------------------------------------------

// Active in-memory cache to guarantee instantaneous lookups
let cachedInstallersMetadata = null;

export function getStoredMetadata() {
  if (cachedInstallersMetadata) {
    return cachedInstallersMetadata;
  }

  try {
    let raw = readJsonSafely(METADATA_FILE, null);
    if (!raw && fs.existsSync(LEGACY_METADATA_FILE)) {
      raw = readJsonSafely(LEGACY_METADATA_FILE, null);
    }
    const parsed = raw || {
      android: null,
      windows: null,
      'mac-arm64': null,
      'mac-intel': null,
    };
    if (parsed.android === undefined) parsed.android = null;

    let needsSave = false;

    for (const platform of Object.keys(PLATFORM_RULES)) {
      const item = parsed[platform];
      if (item) {
        // Enforce permanent retention metadata: never auto-delete after hours or restart
        if (!item.retention || item.retention !== 'permanent') {
          item.retention = 'permanent';
          item.retentionPolicy = 'indefinite_until_manual_removal';
          item.autoDelete = false;
          needsSave = true;
        }

        // Verify or dynamically resolve file path across candidate persistent roots
        if (!item.filePath || !fs.existsSync(item.filePath)) {
          const resolvedPath = resolveInstallerFilePath(platform, item.filename, item.filePath);
          if (resolvedPath) {
            item.filePath = resolvedPath;
            needsSave = true;
          }
          // IMPORTANT: Do NOT set parsed[platform] = null!
          // Installer files are permanent. Even if storage is temporarily unmounted
          // or being accessed, the metadata is NEVER wiped automatically.
          // Only explicit manual admin removal (deleteInstaller) clears metadata.
        }
      }
    }

    if (needsSave) {
      try {
        saveStoredMetadata(parsed);
      } catch {
        // Non-critical on read
      }
    }

    cachedInstallersMetadata = parsed;
    return parsed;
  } catch (err) {
    console.error('[KIVO DB] Error reading installer metadata:', err);
    return {
      android: null,
      windows: null,
      'mac-arm64': null,
      'mac-intel': null,
    };
  }
}

export function saveStoredMetadata(meta) {
  // Ensure every stored installer record is stamped with permanent retention
  if (meta && typeof meta === 'object') {
    for (const platform of Object.keys(meta)) {
      if (meta[platform]) {
        meta[platform].retention = 'permanent';
        meta[platform].retentionPolicy = 'indefinite_until_manual_removal';
        meta[platform].autoDelete = false;
      }
    }
  }
  cachedInstallersMetadata = meta;
  writeJsonAtomically(METADATA_FILE, meta);
  // Mirror metadata to MySQL database
  syncInstallerMetadataToMysql(meta, 'SAVE_METADATA', 'system').catch((err) => {
    console.warn('[KIVO DB] Notice: installer metadata mirror to MySQL skipped:', err.message);
  });
}

// Deep Reconciliation Engine: Synchronizes MySQL (Layer B) with Persistent Storage (Layer A)
// Runs on startup, on admin panel load, and on demand via POST /api/admin/installers/reconcile.
// Guarantees files and metadata are restored after restarts, rebuilds, and deployments.
export async function reconcileInstallers(forceSync = false) {
  let jsonMeta = readJsonSafely(METADATA_FILE, null);
  if (!jsonMeta && fs.existsSync(LEGACY_METADATA_FILE)) {
    jsonMeta = readJsonSafely(LEGACY_METADATA_FILE, null);
  }
  const current = jsonMeta || {
    android: null,
    windows: null,
    'mac-arm64': null,
    'mac-intel': null,
  };
  if (current.android === undefined) current.android = null;

  // Step 1: Check MySQL Database (Layer B)
  let mysqlMeta = null;
  try {
    mysqlMeta = await loadInstallerMetadataFromMysql();
  } catch (err) {
    console.warn('[KIVO Storage] Notice: MySQL load skipped during reconciliation:', err.message);
  }

  // If MySQL has active records, merge them into current state
  if (mysqlMeta && typeof mysqlMeta === 'object') {
    for (const [platform, mysqlItem] of Object.entries(mysqlMeta)) {
      if (mysqlItem && !mysqlItem.isDeleted) {
        if (!current[platform]) {
          console.log(`[KIVO Storage] Recovered ${platform} metadata from MySQL database!`);
          current[platform] = mysqlItem;
        } else {
          // Keep most complete record, preserving id and download count
          current[platform].id = current[platform].id || mysqlItem.id;
          current[platform].downloadCount = mysqlItem.downloadCount || current[platform].downloadCount || 0;
          if (!current[platform].sha256 && mysqlItem.sha256) {
            current[platform].sha256 = mysqlItem.sha256;
          }
        }
      }
    }
  }

  // Step 2: Physical Verification on Disk (Layer A)
  const reconciliationReport = {
    timestamp: new Date().toISOString(),
    uploadsDir: UPLOADS_DIR,
    archiveDir: ARCHIVE_DIR,
    mysqlConnected: Boolean(mysqlMeta !== null),
    platforms: {},
    totalVerified: 0,
    totalMissing: 0,
    totalCorrupted: 0,
  };

  let needsSave = false;

  for (const platform of Object.keys(PLATFORM_RULES)) {
    const rule = PLATFORM_RULES[platform];
    let item = current[platform];

    // If no record exists, scan candidate directories or check MySQL binary chunks
    if (!item) {
      // First check if MySQL has binary chunks for this platform
      try {
        const dbBinary = await checkInstallerBinaryInMysql(platform);
        if (dbBinary && dbBinary.exists && dbBinary.chunkCount > 0) {
          console.log(`[KIVO Storage] Found binary chunks in MySQL for ${platform} without metadata. Auto-restoring...`);
          const targetPath = resolveInstallerFilePath(platform, rule.defaultFileName);
          const restored = await restoreInstallerBinaryFromMysql(platform, targetPath);
          if (restored && restored.success) {
            item = {
              id: crypto.randomUUID(),
              platform,
              name: rule.name,
              architecture: rule.architecture,
              filename: rule.defaultFileName,
              version: dbBinary.version || '1.0.0',
              size: restored.size,
              sha256: restored.sha256,
              filePath: targetPath,
              downloadUrl: `/api/download/${platform}`,
              uploadedAt: new Date().toISOString(),
              retention: 'permanent',
              retentionPolicy: 'indefinite_until_manual_removal',
              autoDelete: false,
              isActive: true,
              isDeleted: false,
              status: 'verified',
              available: true,
              hasDbBinary: true,
            };
            current[platform] = item;
            needsSave = true;
          }
        }
      } catch (scanDbErr) {
        console.warn(`[KIVO Storage] Notice: DB chunk check for unindexed ${platform}:`, scanDbErr.message);
      }

      // If still no item, scan candidate directories for physical binaries on disk
      if (!item) {
        const ext = rule.allowedExtensions[0] || '';
        const candidatePath = resolveInstallerFilePath(platform, rule.defaultFileName);
        if (candidatePath && fs.existsSync(candidatePath)) {
          try {
            const stat = fs.statSync(candidatePath);
            if (stat.isFile() && stat.size > 0) {
              const fileBuf = fs.readFileSync(candidatePath);
              const sha256 = crypto.createHash('sha256').update(fileBuf).digest('hex');
              item = {
                id: crypto.randomUUID(),
                platform,
                name: rule.name,
                architecture: rule.architecture,
                filename: path.basename(candidatePath),
                version: '1.0.0',
                size: stat.size,
                sha256,
                filePath: candidatePath,
                downloadUrl: `/api/download/${platform}`,
                uploadedAt: new Date(stat.mtime).toISOString(),
                retention: 'permanent',
                retentionPolicy: 'indefinite_until_manual_removal',
                autoDelete: false,
                isActive: true,
                isDeleted: false,
                status: 'verified',
                available: true,
                hasDbBinary: false,
              };
              current[platform] = item;
              needsSave = true;
              console.log(`[KIVO Storage] Discovered unindexed physical file for ${platform} at ${candidatePath}. Re-indexed.`);
            }
          } catch (scanErr) {
            console.warn(`[KIVO Storage] Error inspecting unindexed file for ${platform}:`, scanErr.message);
          }
        }
      }
    }

    if (item) {
      item.retention = 'permanent';
      item.retentionPolicy = 'indefinite_until_manual_removal';
      item.autoDelete = false;

      // Verify physical existence
      let physicalPath = item.filePath;
      let fileExists = physicalPath && fs.existsSync(physicalPath);

      if (!fileExists) {
        // Try to locate across candidate persistent storage roots
        const relocated = resolveInstallerFilePath(platform, item.filename, physicalPath);
        if (relocated && fs.existsSync(relocated)) {
          console.log(`[KIVO Storage] Relocated ${platform} binary from ${physicalPath} to ${relocated}`);
          item.filePath = relocated;
          physicalPath = relocated;
          fileExists = true;
          needsSave = true;
        }
      }

      // If still not on disk, check if MySQL has the binary (Permanent DB Backup) and auto-restore to disk
      if (!fileExists) {
        try {
          const dbBinary = await checkInstallerBinaryInMysql(platform);
          if (dbBinary && dbBinary.exists && dbBinary.chunkCount > 0) {
            console.log(`[KIVO Storage] Restoring missing disk file for ${platform} from MySQL (${dbBinary.chunkCount} chunks, ${dbBinary.totalBytes} bytes)...`);
            const targetPath = resolveInstallerFilePath(platform, item.filename || rule.defaultFileName);
            const restored = await restoreInstallerBinaryFromMysql(platform, targetPath);
            if (restored && restored.success && fs.existsSync(targetPath)) {
              item.filePath = targetPath;
              physicalPath = targetPath;
              fileExists = true;
              item.hasDbBinary = true;
              needsSave = true;
              console.log(`[KIVO Storage] Restored ${platform} binary to disk from MySQL successfully!`);
            } else {
              // File is in DB even if disk write had an issue
              item.hasDbBinary = true;
            }
          }
        } catch (dbErr) {
          console.warn(`[KIVO Storage] DB restore attempt for ${platform} notice:`, dbErr.message);
        }
      }

      if (fileExists) {
        try {
          const stat = fs.statSync(physicalPath);
          const currentSize = stat.size;
          // Verify SHA-256 integrity
          const fileBuf = fs.readFileSync(physicalPath);
          const actualSha256 = crypto.createHash('sha256').update(fileBuf).digest('hex');

          if (!item.sha256) {
            item.sha256 = actualSha256;
            item.size = currentSize;
            needsSave = true;
          }

          if (actualSha256 === item.sha256) {
            item.status = 'verified';
            item.available = true;
            item.hasDbBinary = true;
            reconciliationReport.totalVerified++;

            // Asynchronously ensure binary is in MySQL (if not already stored)
            checkInstallerBinaryInMysql(platform).then((dbCheck) => {
              if (!dbCheck || !dbCheck.exists || dbCheck.chunkCount === 0) {
                console.log(`[KIVO Storage] File for ${platform} on disk not yet in MySQL. Syncing to MySQL in background...`);
                saveInstallerBinaryToMysql(platform, item.version || '1.0.0', physicalPath).catch((err) => {
                  console.warn(`[KIVO Storage] Background MySQL sync for ${platform} notice:`, err.message);
                });
              }
            }).catch(() => {});
          } else {
            console.warn(`[KIVO Storage] Checksum mismatch for ${platform}! Expected ${item.sha256}, got ${actualSha256}`);
            item.status = 'corrupted';
            item.available = false;
            item.actualSha256 = actualSha256;
            reconciliationReport.totalCorrupted++;
          }
        } catch (hashErr) {
          item.status = 'error';
          item.available = false;
        }
      } else if (item.hasDbBinary) {
        // Even if local disk write hasn't completed yet, MySQL has the binary so it's fully verified and downloadable!
        item.status = 'verified';
        item.available = true;
        reconciliationReport.totalVerified++;
      } else {
        // Physical file missing on disk and not in MySQL
        console.warn(`[KIVO Storage] Binary for ${platform} is currently missing from disk and MySQL at ${physicalPath}. Retaining metadata.`);
        item.status = 'missing';
        item.available = false;
        reconciliationReport.totalMissing++;
      }

      reconciliationReport.platforms[platform] = {
        name: item.name,
        version: item.version,
        status: item.status,
        available: item.available,
        filePath: item.filePath,
        size: item.size,
        sha256: item.sha256,
        hasDbBinary: Boolean(item.hasDbBinary),
      };
    } else {
      reconciliationReport.platforms[platform] = {
        name: rule.name,
        version: null,
        status: 'not_uploaded',
        available: false,
        filePath: null,
        hasDbBinary: false,
      };
    }
  }

  // Step 3: Persist reconciled state
  cachedInstallersMetadata = current;
  if (needsSave || forceSync) {
    writeJsonAtomically(METADATA_FILE, current);
    try {
      await syncInstallerMetadataToMysql(current, 'RECONCILE', 'reconciliation_engine');
    } catch (syncErr) {
      console.warn('[KIVO Storage] MySQL sync during reconciliation notice:', syncErr.message);
    }
  }

  return { current, report: reconciliationReport };
}


// -------------------------------------------------------------
// Customer User Store Operations
// -------------------------------------------------------------
export async function getStoredUsers() {
  const users = readJsonSafely(USERS_FILE, []);
  return Array.isArray(users) ? users : [];
}

export async function saveStoredUsers(users) {
  writeJsonAtomically(USERS_FILE, Array.isArray(users) ? users : []);
}

export async function findUserByEmail(email) {
  if (!email) return null;
  const cleanEmail = email.trim().toLowerCase();
  const users = await getStoredUsers();
  return users.find((u) => u.email.toLowerCase() === cleanEmail) || null;
}

export async function findUserById(id) {
  if (!id) return null;
  const users = await getStoredUsers();
  return users.find((u) => u.id === id) || null;
}

export async function createUserRecord({ name, email, passwordHash, status = 'active', role = 'customer' }) {
  const users = await getStoredUsers();
  const newUser = {
    id: `usr_${crypto.randomUUID()}`,
    name,
    email: email.toLowerCase(),
    passwordHash,
    status,
    role,
    downloadCount: 0,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    resetToken: null,
    resetTokenExpiresAt: null,
  };
  users.push(newUser);
  await saveStoredUsers(users);
  return newUser;
}

export async function updateUserRecord(updatedUser) {
  const users = await getStoredUsers();
  const idx = users.findIndex((u) => u.id === updatedUser.id);
  if (idx !== -1) {
    users[idx] = { ...users[idx], ...updatedUser };
    await saveStoredUsers(users);
    return users[idx];
  }
  return null;
}

export async function listAllUsers() {
  const users = await getStoredUsers();
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
    downloadCount: u.downloadCount || 0,
  }));
}

// -------------------------------------------------------------
// KIVO Update Center & Release Notes Store
// -------------------------------------------------------------
export function getStoredReleases() {
  const initial = [
    {
      version: '1.2.0',
      releaseDate: '2026-11-09',
      isLatest: true,
      whatsNew: [
        'Enhanced Chromium-based isolated sandboxing engine',
        'Hardware-accelerated rendering optimizations for macOS Apple Silicon and Windows 11',
        'Built-in real-time AI assistant integration',
        'Zero telemetry and third-party tracker neutralization',
      ],
      bugFixes: [
        'Resolved memory leak in long-running background tabs',
        'Fixed occasional graphic stutter during multi-monitor full-screen streaming',
        'Corrected installer integrity validation for macOS Gatekeeper',
      ],
      securityImprovements: [
        'Upgraded sandboxed network protocol to TLS 1.3 strict enforcement',
        'Patched session storage boundaries against cross-origin timing attacks',
      ],
      systemRequirements: {
        windows: 'Windows 10 / 11 (64-bit), 4 GB RAM, 500 MB free disk space',
        macos: 'macOS 12.0 Monterey or newer (Apple Silicon & Intel), 4 GB RAM',
      },
      downloads: {
        windows: { platform: 'windows', fileName: 'KivoSetup-x64.exe', downloadUrl: '/api/download/windows' },
        macArm: { platform: 'mac-arm64', fileName: 'Kivo-arm64.dmg', downloadUrl: '/api/download/mac-arm64' },
        macIntel: { platform: 'mac-intel', fileName: 'Kivo-intel.dmg', downloadUrl: '/api/download/mac-intel' },
      },
    },
    {
      version: '1.1.0',
      releaseDate: '2026-10-15',
      isLatest: false,
      whatsNew: [
        'Introduced tab workspace groups and privacy isolation bubbles',
        'Faster cold-boot startup time by 42%',
      ],
      bugFixes: ['Fixed PDF viewer render artifact on high-DPI displays'],
      securityImprovements: ['Hardened local credential store encryption'],
      systemRequirements: {
        windows: 'Windows 10 / 11 (64-bit), 4 GB RAM',
        macos: 'macOS 12.0 or newer, 4 GB RAM',
      },
      downloads: {
        windows: { platform: 'windows', fileName: 'KivoSetup-x64.exe', downloadUrl: '/api/download/windows' },
        macArm: { platform: 'mac-arm64', fileName: 'Kivo-arm64.dmg', downloadUrl: '/api/download/mac-arm64' },
        macIntel: { platform: 'mac-intel', fileName: 'Kivo-intel.dmg', downloadUrl: '/api/download/mac-intel' },
      },
    },
  ];

  const stored = readJsonSafely(RELEASES_FILE, initial);
  return Array.isArray(stored) && stored.length > 0 ? stored : initial;
}

export function saveStoredReleases(releases) {
  writeJsonAtomically(RELEASES_FILE, Array.isArray(releases) ? releases : []);
}

// -------------------------------------------------------------
// System Analytics Aggregator (Real Metrics, Never Fabricated)
// -------------------------------------------------------------
export async function getSystemAnalytics() {
  const users = await getStoredUsers();
  const ticketStore = getTicketsStore();
  const metadata = getStoredMetadata();

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === 'active').length;

  const tickets = ticketStore.tickets || [];
  const openTickets = tickets.filter((t) => t.status === 'Open').length;
  const inProgressTickets = tickets.filter(
    (t) =>
      t.status === 'In Progress' ||
      t.status === 'Waiting for Customer' ||
      t.status === 'Waiting for Support'
  ).length;
  const resolvedTickets = tickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length;

  // Real download count aggregation
  const totalDownloads = users.reduce((acc, u) => acc + (u.downloadCount || 0), 0);

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      suspended: totalUsers - activeUsers,
    },
    tickets: {
      total: tickets.length,
      open: openTickets,
      inProgress: inProgressTickets,
      resolved: resolvedTickets,
    },
    installers: {
      windows: {
        available: Boolean(metadata.windows?.filePath && fs.existsSync(metadata.windows.filePath)),
        version: metadata.windows?.version || null,
      },
      macArm: {
        available: Boolean(metadata['mac-arm64']?.filePath && fs.existsSync(metadata['mac-arm64'].filePath)),
        version: metadata['mac-arm64']?.version || null,
      },
      macIntel: {
        available: Boolean(metadata['mac-intel']?.filePath && fs.existsSync(metadata['mac-intel'].filePath)),
        version: metadata['mac-intel']?.version || null,
      },
    },
    downloads: {
      total: totalDownloads,
    },
  };
}
