import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  CheckCircle2,
  Calendar,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface ReleaseRecord {
  version: string;
  releaseDate: string;
  isLatest: boolean;
  whatsNew: string[];
  bugFixes: string[];
  securityImprovements: string[];
}

interface AdminReleasesTabProps {
  csrfToken: string;
}

export const AdminReleasesTab: React.FC<AdminReleasesTabProps> = ({ csrfToken }) => {
  const [releases, setReleases] = useState<ReleaseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [version, setVersion] = useState('');
  const [releaseDate, setReleaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isLatest, setIsLatest] = useState(true);
  const [whatsNewInput, setWhatsNewInput] = useState('');
  const [bugFixesInput, setBugFixesInput] = useState('');
  const [securityInput, setSecurityInput] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchReleases = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/updates');
      const json = await res.json();
      if (json.releases) {
        setReleases(json.releases);
      }
    } catch (err) {
      console.error('Failed to load releases:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReleases();
  }, []);

  const handleCreateRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const whatsNew = whatsNewInput
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const bugFixes = bugFixesInput
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const securityImprovements = securityInput
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetch('/api/admin/updates/release', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          version,
          releaseDate,
          isLatest,
          whatsNew,
          bugFixes,
          securityImprovements,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to publish release.');

      setMessage({ type: 'success', text: `Release v${version} published successfully!` });
      setShowAddForm(false);
      setVersion('');
      setWhatsNewInput('');
      setBugFixesInput('');
      setSecurityInput('');
      fetchReleases();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white font-display flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-kivo-cyan" />
            <span>KIVO Update Center & Release Management</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage release notes, changelog items, and latest version designations displayed in the public Update Center.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchReleases}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-xs font-medium text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-kivo-cyan' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-kivo-blue hover:bg-kivo-blue/90 text-xs font-semibold text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Release</span>
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Add New Release Drawer/Form */}
      {showAddForm && (
        <form onSubmit={handleCreateRelease} className="p-6 rounded-3xl bg-black/40 border border-white/[0.1] space-y-4">
          <h3 className="text-base font-bold text-white font-display">Publish New Browser Release</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Release Version</label>
              <input
                type="text"
                required
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.3.0"
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/[0.1] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-kivo-cyan"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Release Date</label>
              <input
                type="date"
                required
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/[0.1] text-xs text-white focus:outline-none focus:border-kivo-cyan"
              />
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isLatest}
                  onChange={(e) => setIsLatest(e.target.checked)}
                  className="rounded border-white/20 text-kivo-cyan focus:ring-kivo-cyan"
                />
                <span>Set as Latest Public Release</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">What's New (one item per line)</label>
            <textarea
              rows={3}
              value={whatsNewInput}
              onChange={(e) => setWhatsNewInput(e.target.value)}
              placeholder="Added hardware accelerated rendering&#10;Zero telemetry sandboxing upgrade"
              className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/[0.1] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-kivo-cyan font-sans"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Bug Fixes (one item per line)</label>
              <textarea
                rows={3}
                value={bugFixesInput}
                onChange={(e) => setBugFixesInput(e.target.value)}
                placeholder="Fixed PDF render issue&#10;Corrected download progress calculation"
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/[0.1] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-kivo-cyan font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Security Improvements</label>
              <textarea
                rows={3}
                value={securityInput}
                onChange={(e) => setSecurityInput(e.target.value)}
                placeholder="Patched session storage boundaries&#10;Upgraded TLS 1.3 protocol"
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/[0.1] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-kivo-cyan font-sans"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-xs text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-kivo-blue hover:bg-kivo-blue/90 text-xs font-semibold text-white transition-colors"
            >
              {isSaving ? 'Publishing...' : 'Publish Release'}
            </button>
          </div>
        </form>
      )}

      {/* Release List */}
      <div className="space-y-4">
        {releases.map((rel) => (
          <div
            key={rel.version}
            className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.12] transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-base font-bold text-white font-display">v{rel.version}</span>
                {rel.isLatest && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Latest
                  </span>
                )}
                <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  {rel.releaseDate}
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-300 space-y-1">
              {rel.whatsNew.slice(0, 3).map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-kivo-cyan">•</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
