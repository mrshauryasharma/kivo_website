export interface CmsContent {
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    primaryCtaText: string;
    primaryCtaLink: string;
    secondaryCtaText: string;
    secondaryCtaLink: string;
    heroImage: string;
  };
  navigation: {
    logoText: string;
    navLinks: Array<{ label: string; href: string; isVisible: boolean }>;
    ctaText: string;
    ctaLink: string;
  };
  features: {
    sectionTitle: string;
    sectionSubtitle: string;
    items: Array<{
      id: string;
      title: string;
      description: string;
      icon: string;
      isVisible: boolean;
    }>;
  };
  privacy: {
    sectionTitle: string;
    sectionSubtitle: string;
    badges: Array<{
      title: string;
      description: string;
      icon: string;
    }>;
  };
  showcase: {
    title: string;
    subtitle: string;
    tabs: Array<{
      id: string;
      title: string;
      description: string;
    }>;
  };
  about: {
    heading: string;
    paragraph1: string;
    paragraph2: string;
    missionTitle: string;
    missionText: string;
    visionTitle: string;
    visionText: string;
  };
  ceo: {
    isVisible: boolean;
    name: string;
    designation: string;
    heading: string;
    education: string;
    bio: string;
    expertise: string[];
    social: {
      linkedin: string;
      twitter: string;
      github: string;
      email: string;
    };
    quote: string;
    leadershipPrinciples: Array<{
      title: string;
      description: string;
    }>;
  };
  downloads: {
    sectionTitle: string;
    sectionSubtitle: string;
    platforms: Array<{
      id: string;
      name: string;
      arch: string;
      badge: string;
      description: string;
      requirements: string;
    }>;
  };
  footer: {
    tagline: string;
    copyright: string;
    contactEmail: string;
    links: Array<{ label: string; href: string }>;
  };
  contact: {
    supportEmail: string;
    businessEmail: string;
    officeAddress: string;
    supportHours: string;
    phone: string;
  };
  seo: {
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string;
  };
  announcement: {
    isEnabled: boolean;
    type: 'info' | 'warning' | 'alert' | 'maintenance';
    message: string;
    actionText: string;
    actionLink: string;
    dismissible: boolean;
  };
}

export interface SupportTicketAttachment {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
}

export interface SupportTicketMessage {
  id: string;
  sender: string;
  senderType: 'customer' | 'admin' | 'system';
  text: string;
  timestamp: string;
  attachments?: SupportTicketAttachment[];
  emailStatus?: string;
  emailError?: string | null;
}

export interface SupportTicketInternalNote {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

export interface SupportTicketStatusHistory {
  from: string | null;
  to: string;
  changedBy: string;
  timestamp: string;
  reason?: string;
}

export interface SupportTicketEmailLog {
  id: string;
  type: string;
  recipient: string;
  subject: string;
  status: string; // 'delivered' | 'failed' | 'skipped'
  error?: string | null;
  timestamp: string;
  resendId?: string | null;
  retriedAt?: string;
}

export type TicketStatus = 'Open' | 'Reopened' | 'In Progress' | 'Waiting for Customer' | 'Closed';

export interface SupportTicket {
  id: string;
  name: string;
  email: string;
  phone?: string;
  category: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority?: string;
  createdAt: string;
  updatedAt: string;
  lastResponseAt?: string | null;
  messages: SupportTicketMessage[];
  internalNotes?: SupportTicketInternalNote[];
  statusHistory?: SupportTicketStatusHistory[];
  emailLogs?: SupportTicketEmailLog[];
}
