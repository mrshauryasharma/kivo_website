import React, { useState, useEffect } from 'react';
import {
  Save,
  Send,
  History,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sparkles,
  Layers,
  Shield,
  User,
  Download,
  FileText,
  Mail,
  Search,
  Bell,
  RefreshCw,
  X,
} from 'lucide-react';
import type { CmsContent } from '../../types/cms';

interface AdminCmsTabProps {
  csrfToken: string;
}

export const AdminCmsTab: React.FC<AdminCmsTabProps> = ({ csrfToken }) => {
  const [activeSection, setActiveSection] = useState<string>('hero');
  const [draft, setDraft] = useState<CmsContent | null>(null);
  const [published, setPublished] = useState<CmsContent | null>(null);
  const [historyList, setHistoryList] = useState<
    Array<{ id: string; timestamp: string; author: string; note: string }>
  >([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [publishNote, setPublishNote] = useState('');

  const fetchCmsData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/cms', {
        headers: { 'X-CSRF-Token': csrfToken },
      });
      if (res.ok) {
        const data = await res.json();
        setDraft(data.draft);
        setPublished(data.published);
        setHistoryList(data.history || []);
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to load CMS content.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCmsData();
  }, []);

  const handleSaveDraft = async () => {
    if (!draft) return;
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/admin/cms/draft', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ draft }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save draft');

      setStatusMessage({ type: 'success', text: 'Draft saved successfully.' });
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error saving draft.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!draft) return;
    setIsPublishing(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/admin/cms/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ note: publishNote || 'Updated content via Admin CMS' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish');

      setPublished(data.published);
      setPublishNote('');
      setStatusMessage({ type: 'success', text: 'Published live to website!' });
      fetchCmsData();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error publishing.' });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRevert = async (revisionId: string) => {
    if (!window.confirm(`Are you sure you want to revert to revision ${revisionId}?`)) return;

    try {
      const res = await fetch('/api/admin/cms/revert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ revisionId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revert');

      setHistoryModalOpen(false);
      fetchCmsData();
      setStatusMessage({ type: 'success', text: 'Reverted successfully!' });
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Error reverting.');
    }
  };

  if (isLoading || !draft) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="w-8 h-8 mx-auto text-kivo-cyan animate-spin mb-3" />
        <span className="text-xs text-slate-400">Loading website content schema...</span>
      </div>
    );
  }

  const sections = [
    { id: 'hero', name: 'Hero Banner', icon: Sparkles },
    { id: 'ceo', name: 'CEO Shaurya Sharma', icon: User },
    { id: 'features', name: 'Features', icon: Layers },
    { id: 'privacy', name: 'Privacy Architecture', icon: Shield },
    { id: 'about', name: 'About KIVO', icon: FileText },
    { id: 'downloads', name: 'Downloads & Specs', icon: Download },
    { id: 'announcement', name: 'Notice Banner', icon: Bell },
    { id: 'contact', name: 'Contact Info', icon: Mail },
    { id: 'seo', name: 'SEO Metadata', icon: Search },
  ];

  return (
    <div>
      {/* Top Action Header */}
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white/[0.03] border border-white/[0.08]">
        <div>
          <h2 className="text-xl font-bold text-white font-display">
            Website Content Management System (CMS)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Edit and publish website copy, leadership credentials, and announcements without touching code.
            {published && <span className="ml-2 text-emerald-400">• Live content synced</span>}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setHistoryModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-slate-200 transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            <span>Revisions ({historyList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setPreviewModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-slate-200 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview Draft</span>
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-kivo-blue/20 hover:bg-kivo-blue/30 text-kivo-cyan border border-kivo-cyan/30 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
          </button>

          <button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-kivo-blue via-kivo-cyan to-kivo-purple text-white text-xs font-bold shadow-lg shadow-kivo-blue/20 hover:opacity-95 transition-opacity disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isPublishing ? 'Publishing...' : 'Publish to Live'}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`mb-6 p-3.5 rounded-2xl border flex items-center gap-2.5 text-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main CMS Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-3 space-y-1.5">
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-kivo-cyan/15 text-kivo-cyan border border-kivo-cyan/30 shadow-md'
                    : 'bg-white/[0.02] text-slate-400 hover:text-white hover:bg-white/[0.05] border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{sec.name}</span>
              </button>
            );
          })}
        </div>

        {/* Content Editor Panel */}
        <div className="lg:col-span-9 rounded-3xl bg-gradient-to-b from-[#0D1426]/90 to-[#070B14]/95 border border-white/[0.1] p-6 sm:p-8 backdrop-blur-xl shadow-xl">
          {/* Section 1: Hero */}
          {activeSection === 'hero' && (
            <div className="space-y-5">
              <h3 className="text-base font-bold text-white font-display mb-4">
                Hero Section Configuration
              </h3>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Badge Text
                </label>
                <input
                  type="text"
                  value={draft.hero.badge}
                  onChange={(e) =>
                    setDraft({ ...draft, hero: { ...draft.hero, badge: e.target.value } })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-kivo-cyan"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Headline Title
                </label>
                <input
                  type="text"
                  value={draft.hero.title}
                  onChange={(e) =>
                    setDraft({ ...draft, hero: { ...draft.hero, title: e.target.value } })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-kivo-cyan"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Sub-headline / Paragraph
                </label>
                <textarea
                  rows={3}
                  value={draft.hero.subtitle}
                  onChange={(e) =>
                    setDraft({ ...draft, hero: { ...draft.hero, subtitle: e.target.value } })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-kivo-cyan resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Primary CTA Label
                  </label>
                  <input
                    type="text"
                    value={draft.hero.primaryCtaText}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        hero: { ...draft.hero, primaryCtaText: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-kivo-cyan"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Primary CTA Link
                  </label>
                  <input
                    type="text"
                    value={draft.hero.primaryCtaLink}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        hero: { ...draft.hero, primaryCtaLink: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-kivo-cyan"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 2: CEO & Co-Founder Shaurya Sharma */}
          {activeSection === 'ceo' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <div>
                  <h3 className="text-base font-bold text-white font-display">
                    CEO & Co-Founder Profile (Shaurya Sharma)
                  </h3>
                  <span className="text-xs text-slate-400">
                    Controls the executive profile and leadership section.
                  </span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.ceo.isVisible}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        ceo: { ...draft.ceo, isVisible: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded text-kivo-cyan focus:ring-0 bg-slate-900 border-white/20"
                  />
                  <span className="text-xs font-semibold text-slate-200">Visible on Site</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Executive Name
                  </label>
                  <input
                    type="text"
                    value={draft.ceo.name}
                    onChange={(e) =>
                      setDraft({ ...draft, ceo: { ...draft.ceo, name: e.target.value } })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-kivo-cyan"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={draft.ceo.designation}
                    onChange={(e) =>
                      setDraft({ ...draft, ceo: { ...draft.ceo, designation: e.target.value } })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-kivo-cyan"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Academic Degree & Institution
                </label>
                <input
                  type="text"
                  value={draft.ceo.education}
                  onChange={(e) =>
                    setDraft({ ...draft, ceo: { ...draft.ceo, education: e.target.value } })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-kivo-cyan"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Professional Profile & Bio
                </label>
                <textarea
                  rows={4}
                  value={draft.ceo.bio}
                  onChange={(e) =>
                    setDraft({ ...draft, ceo: { ...draft.ceo, bio: e.target.value } })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-kivo-cyan resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Areas of Expertise (Comma-separated)
                </label>
                <input
                  type="text"
                  value={draft.ceo.expertise.join(', ')}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      ceo: {
                        ...draft.ceo,
                        expertise: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      },
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-kivo-cyan"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    LinkedIn URL
                  </label>
                  <input
                    type="url"
                    value={draft.ceo.social.linkedin}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        ceo: {
                          ...draft.ceo,
                          social: { ...draft.ceo.social, linkedin: e.target.value },
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-kivo-cyan"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    GitHub URL
                  </label>
                  <input
                    type="url"
                    value={draft.ceo.social.github}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        ceo: {
                          ...draft.ceo,
                          social: { ...draft.ceo.social, github: e.target.value },
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-kivo-cyan"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Notice Banner */}
          {activeSection === 'announcement' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <div>
                  <h3 className="text-base font-bold text-white font-display">
                    Announcement & Maintenance Banner
                  </h3>
                  <span className="text-xs text-slate-400">
                    Display an urgent update or release notice across the top of all pages.
                  </span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.announcement.isEnabled}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        announcement: { ...draft.announcement, isEnabled: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded text-kivo-cyan focus:ring-0 bg-slate-900 border-white/20"
                  />
                  <span className="text-xs font-semibold text-white">Enable Banner</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Notice Type / Severity
                </label>
                <select
                  value={draft.announcement.type}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      announcement: {
                        ...draft.announcement,
                        type: e.target.value as any,
                      },
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-kivo-cyan"
                >
                  <option value="info" className="bg-slate-900 text-white">Information (Electric Blue / Cyan)</option>
                  <option value="warning" className="bg-slate-900 text-white">Warning (Amber / Yellow)</option>
                  <option value="alert" className="bg-slate-900 text-white">Alert / Critical Notice (Rose / Red)</option>
                  <option value="maintenance" className="bg-slate-900 text-white">Scheduled Maintenance (Purple)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Banner Message Text
                </label>
                <input
                  type="text"
                  value={draft.announcement.message}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      announcement: { ...draft.announcement, message: e.target.value },
                    })
                  }
                  placeholder="e.g. KIVO Browser v1.1 update released with enhanced AI workspace!"
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-kivo-cyan"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Action Button Label
                  </label>
                  <input
                    type="text"
                    value={draft.announcement.actionText}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        announcement: { ...draft.announcement, actionText: e.target.value },
                      })
                    }
                    placeholder="Download Now"
                    className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-kivo-cyan"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Action Link URL
                  </label>
                  <input
                    type="text"
                    value={draft.announcement.actionLink}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        announcement: { ...draft.announcement, actionLink: e.target.value },
                      })
                    }
                    placeholder="#download"
                    className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-kivo-cyan"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Features */}
          {activeSection === 'features' && (
            <div className="space-y-5">
              <h3 className="text-base font-bold text-white font-display mb-4">
                Features Overview
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {draft.features.items.map((item, idx) => (
                  <div key={item.id} className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-kivo-cyan font-mono">
                        Feature #{idx + 1}
                      </span>
                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300">
                        <input
                          type="checkbox"
                          checked={item.isVisible}
                          onChange={(e) => {
                            const updated = [...draft.features.items];
                            updated[idx].isVisible = e.target.checked;
                            setDraft({ ...draft, features: { ...draft.features, items: updated } });
                          }}
                        />
                        <span>Visible</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => {
                        const updated = [...draft.features.items];
                        updated[idx].title = e.target.value;
                        setDraft({ ...draft, features: { ...draft.features, items: updated } });
                      }}
                      className="w-full px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white font-semibold focus:outline-none focus:border-kivo-cyan"
                    />
                    <textarea
                      rows={2}
                      value={item.description}
                      onChange={(e) => {
                        const updated = [...draft.features.items];
                        updated[idx].description = e.target.value;
                        setDraft({ ...draft, features: { ...draft.features, items: updated } });
                      }}
                      className="w-full px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-kivo-cyan resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 5: Privacy */}
          {activeSection === 'privacy' && (
            <div className="space-y-5">
              <h3 className="text-base font-bold text-white font-display mb-4">
                Privacy Architecture
              </h3>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Section Headline
                </label>
                <input
                  type="text"
                  value={draft.privacy.sectionTitle}
                  onChange={(e) =>
                    setDraft({ ...draft, privacy: { ...draft.privacy, sectionTitle: e.target.value } })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-kivo-cyan"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Subtitle
                </label>
                <textarea
                  rows={3}
                  value={draft.privacy.sectionSubtitle}
                  onChange={(e) =>
                    setDraft({ ...draft, privacy: { ...draft.privacy, sectionSubtitle: e.target.value } })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-kivo-cyan resize-none"
                />
              </div>
            </div>
          )}

          {/* Section 6: About */}
          {activeSection === 'about' && (
            <div className="space-y-5">
              <h3 className="text-base font-bold text-white font-display mb-4">
                About KIVO Browser
              </h3>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Main Heading
                </label>
                <input
                  type="text"
                  value={draft.about.heading}
                  onChange={(e) =>
                    setDraft({ ...draft, about: { ...draft.about, heading: e.target.value } })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-kivo-cyan"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Paragraph 1
                </label>
                <textarea
                  rows={3}
                  value={draft.about.paragraph1}
                  onChange={(e) =>
                    setDraft({ ...draft, about: { ...draft.about, paragraph1: e.target.value } })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-kivo-cyan resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Paragraph 2
                </label>
                <textarea
                  rows={3}
                  value={draft.about.paragraph2}
                  onChange={(e) =>
                    setDraft({ ...draft, about: { ...draft.about, paragraph2: e.target.value } })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-kivo-cyan resize-none"
                />
              </div>
            </div>
          )}

          {/* Section 7: Downloads */}
          {activeSection === 'downloads' && (
            <div className="space-y-5">
              <h3 className="text-base font-bold text-white font-display mb-4">
                Downloads Copy & Requirements
              </h3>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Section Title
                </label>
                <input
                  type="text"
                  value={draft.downloads.sectionTitle}
                  onChange={(e) =>
                    setDraft({ ...draft, downloads: { ...draft.downloads, sectionTitle: e.target.value } })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-kivo-cyan"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Section Subtitle
                </label>
                <textarea
                  rows={2}
                  value={draft.downloads.sectionSubtitle}
                  onChange={(e) =>
                    setDraft({ ...draft, downloads: { ...draft.downloads, sectionSubtitle: e.target.value } })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-kivo-cyan resize-none"
                />
              </div>
            </div>
          )}

          {/* Section 8: Contact */}
          {activeSection === 'contact' && (
            <div className="space-y-5">
              <h3 className="text-base font-bold text-white font-display mb-4">
                Contact & Support Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Support Email
                  </label>
                  <input
                    type="email"
                    value={draft.contact.supportEmail}
                    onChange={(e) =>
                      setDraft({ ...draft, contact: { ...draft.contact, supportEmail: e.target.value } })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-kivo-cyan"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={draft.contact.phone}
                    onChange={(e) =>
                      setDraft({ ...draft, contact: { ...draft.contact, phone: e.target.value } })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-kivo-cyan"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 9: SEO */}
          {activeSection === 'seo' && (
            <div className="space-y-5">
              <h3 className="text-base font-bold text-white font-display mb-4">
                SEO & Open Graph Metadata
              </h3>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Page Title (Meta Title)
                </label>
                <input
                  type="text"
                  value={draft.seo.metaTitle}
                  onChange={(e) =>
                    setDraft({ ...draft, seo: { ...draft.seo, metaTitle: e.target.value } })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-kivo-cyan"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Meta Description
                </label>
                <textarea
                  rows={3}
                  value={draft.seo.metaDescription}
                  onChange={(e) =>
                    setDraft({ ...draft, seo: { ...draft.seo, metaDescription: e.target.value } })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-kivo-cyan resize-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* History & Revert Modal */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-xl bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-kivo-cyan" />
                <h3 className="text-base font-bold text-white">Revision History & Revert</h3>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-3">
              {historyList.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No past revisions recorded.</p>
              ) : (
                historyList.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3.5 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-white">{rev.note || 'Website update'}</p>
                      <span className="text-[11px] text-slate-400">
                        {new Date(rev.timestamp).toLocaleString()} • {rev.author}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRevert(rev.id)}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live Preview Modal */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-3xl max-h-[85vh] bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-kivo-cyan" />
                <h3 className="text-base font-bold text-white">Draft Content JSON Inspector</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-emerald-400 overflow-x-auto max-h-[60vh]">
              {JSON.stringify(draft, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
