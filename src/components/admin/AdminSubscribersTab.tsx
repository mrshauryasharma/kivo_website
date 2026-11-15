import React, { useState, useEffect } from 'react';
import {
  Bell,
  Search,
  CheckCircle2,
  Clock,
  RefreshCw,
  Mail,
  Send,
  Smartphone,
  Monitor,
  Apple,
  AlertCircle,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';

interface SubscriberRecord {
  id: string;
  email: string;
  platform: string;
  status: 'pending' | 'notified';
  created_at: string;
  notified_at: string | null;
}

interface SubscriberCounts {
  total: number;
  pending: number;
  notified: number;
  byPlatform: {
    android: number;
    windows: number;
    'mac-arm64': number;
    'mac-intel': number;
  };
}

interface AdminSubscribersTabProps {
  csrfToken: string;
}

export const AdminSubscribersTab: React.FC<AdminSubscribersTabProps> = ({ csrfToken }) => {
  const [subscribers, setSubscribers] = useState<SubscriberRecord[]>([]);
  const [counts, setCounts] = useState<SubscriberCounts>({
    total: 0,
    pending: 0,
    notified: 0,
    byPlatform: { android: 0, windows: 0, 'mac-arm64': 0, 'mac-intel': 0 },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'android' | 'windows' | 'mac-arm64' | 'mac-intel'>('all');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState<string | null>(null);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);

  const fetchSubscribers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/subscribers', {
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'X-CSRF-Token': csrfToken,
          'Cache-Control': 'no-cache, no-store',
        },
      });
      const data = await res.json();
      if (data.subscribers) {
        setSubscribers(data.subscribers);
      }
      if (data.counts) {
        setCounts(data.counts);
      }
    } catch (err) {
      console.error('Failed to load subscribers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const handleBroadcast = async (targetPlatform: string) => {
    const confirmSend = window.confirm(
      `Send launch notification email to all pending ${targetPlatform.toUpperCase()} subscribers now?`
    );
    if (!confirmSend) return;

    setIsBroadcasting(true);
    setBroadcastStatus(null);
    setBroadcastError(null);
    try {
      const res = await fetch('/api/admin/subscribers/notify', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ platform: targetPlatform }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBroadcastStatus(data.message || `Notified ${data.notifiedCount} subscriber(s)!`);
        fetchSubscribers();
      } else {
        setBroadcastError(
          data.error ||
            'Resend failed to deliver email. In testing mode, you must verify your domain or send to your registered email.'
        );
        fetchSubscribers();
      }
    } catch {
      setBroadcastError('Network error while broadcasting notifications.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleResetStatus = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/subscribers/${id}/reset`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });
      if (res.ok) {
        fetchSubscribers();
      }
    } catch (err) {
      console.error('Failed to reset status:', err);
    }
  };

  const filteredSubscribers = subscribers.filter((sub) => {
    const matchesSearch =
      sub.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.platform.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = platformFilter === 'all' || sub.platform === platformFilter;
    return matchesSearch && matchesPlatform;
  });

  const getPlatformBadge = (platform: string) => {
    switch (platform) {
      case 'android':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <Smartphone className="w-3 h-3" />
            Android
          </span>
        );
      case 'windows':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
            <Monitor className="w-3 h-3" />
            Windows
          </span>
        );
      case 'mac-arm64':
      case 'macos':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 border border-purple-500/30 text-purple-400">
            <Apple className="w-3 h-3" />
            macOS (ARM)
          </span>
        );
      case 'mac-intel':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/15 border border-slate-500/30 text-slate-300">
            <Apple className="w-3 h-3" />
            macOS (Intel)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 border border-white/20 text-slate-300">
            {platform}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white font-display flex items-center gap-2">
            <Bell className="w-6 h-6 text-kivo-cyan" />
            <span>Release Notification Subscribers</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Customers registered to receive launch notifications the moment Android APK, Windows EXE, or macOS DMG downloads go live.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchSubscribers}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-slate-200 transition-colors border border-white/[0.08]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-kivo-cyan' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {broadcastStatus && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{broadcastStatus}</span>
          </div>
          <button
            onClick={() => setBroadcastStatus(null)}
            className="text-xs text-emerald-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {broadcastError && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold text-white block">Resend Delivery Rejection:</span>
              <p className="mt-1 text-rose-200 leading-relaxed">{broadcastError}</p>
            </div>
          </div>
          <button
            onClick={() => setBroadcastError(null)}
            className="text-xs text-rose-400 hover:underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Resend Domain Verification Explanation Banner */}
      <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-200 text-xs flex items-start gap-3">
        <Mail className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
        <div className="space-y-1.5 flex-1">
          <span className="font-semibold text-white flex items-center gap-2">
            <span>Resend Live Email Delivery Requirement:</span>
          </span>
          <p className="text-slate-300 leading-relaxed">
            In Resend Testing Mode (<code className="text-sky-300 font-mono">onboarding@resend.dev</code>), Resend strictly allows delivering emails only to your account owner email (<code className="text-sky-300 font-mono">zynotixx0@gmail.com</code>).
            To broadcast emails to any external customer (Gmail, Yahoo, Outlook, etc.), you must add your custom domain in Resend:
          </p>
          <div className="pt-1 flex items-center gap-2">
            <a
              href="https://resend.com/domains"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-sky-500/20 border border-sky-500/30 text-sky-300 hover:text-white font-medium text-[11px] transition-colors"
            >
              <span>Open Resend Domains</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-slate-400 text-[11px]">→ Add kivobrowser.com and add the 3 DNS records in GoDaddy/cPanel.</span>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-black/40 border border-white/[0.08]">
          <span className="text-xs text-slate-400 block mb-1">Total Subscribers</span>
          <span className="text-2xl font-bold text-white font-mono">{counts.total}</span>
        </div>
        <div className="p-5 rounded-2xl bg-black/40 border border-white/[0.08]">
          <span className="text-xs text-amber-300 block mb-1">Pending Alert</span>
          <span className="text-2xl font-bold text-amber-400 font-mono">{counts.pending}</span>
        </div>
        <div className="p-5 rounded-2xl bg-black/40 border border-white/[0.08]">
          <span className="text-xs text-emerald-300 block mb-1">Notified & Sent</span>
          <span className="text-2xl font-bold text-emerald-400 font-mono">{counts.notified}</span>
        </div>
        <div className="p-5 rounded-2xl bg-black/40 border border-white/[0.08]">
          <span className="text-xs text-kivo-cyan block mb-1">Android Waiting</span>
          <span className="text-2xl font-bold text-kivo-cyan font-mono">{counts.byPlatform?.android || 0}</span>
        </div>
      </div>

      {/* Manual Broadcast Action Buttons */}
      <div className="p-5 rounded-2xl bg-[#0B101E] border border-white/[0.1] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-white">Broadcast Launch Email</h4>
            <p className="text-xs text-slate-400">
              Immediately email all customers waiting for a specific platform when its download link goes live.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isBroadcasting}
              onClick={() => handleBroadcast('android')}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Notify Android</span>
            </button>
            <button
              type="button"
              disabled={isBroadcasting}
              onClick={() => handleBroadcast('windows')}
              className="px-3.5 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Notify Windows</span>
            </button>
            <button
              type="button"
              disabled={isBroadcasting}
              onClick={() => handleBroadcast('mac-arm64')}
              className="px-3.5 py-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 hover:bg-purple-500/25 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Notify macOS</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer email or platform..."
            className="w-full pl-9 pr-4 py-2.5 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-kivo-cyan transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'android', 'windows', 'mac-arm64', 'mac-intel'] as const).map((plat) => (
            <button
              key={plat}
              onClick={() => setPlatformFilter(plat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${
                platformFilter === plat
                  ? 'bg-kivo-cyan/20 border border-kivo-cyan/40 text-kivo-cyan'
                  : 'bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-white'
              }`}
            >
              {plat === 'all'
                ? 'All Platforms'
                : plat === 'android'
                ? 'Android'
                : plat === 'windows'
                ? 'Windows'
                : plat === 'mac-arm64'
                ? 'macOS ARM'
                : 'macOS Intel'}
            </button>
          ))}
        </div>
      </div>

      {/* Subscribers Table */}
      <div className="rounded-2xl border border-white/[0.08] bg-black/40 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-kivo-cyan" />
            <span>Loading customer subscribers...</span>
          </div>
        ) : filteredSubscribers.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
            <Mail className="w-8 h-8 text-slate-600 mb-1" />
            <span className="font-semibold text-slate-300">No subscribers found</span>
            <span className="text-[11px]">When customers click "Notify Me on Launch" on the website, their emails will appear here.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400">
                  <th className="py-3.5 px-4 font-semibold">Customer Email</th>
                  <th className="py-3.5 px-4 font-semibold">Platform</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Date Registered</th>
                  <th className="py-3.5 px-4 font-semibold">Notified At</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {filteredSubscribers.map((sub) => (
                  <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono text-white font-medium select-all">{sub.email}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {getPlatformBadge(sub.platform)}
                    </td>
                    <td className="py-3.5 px-4">
                      {sub.status === 'notified' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Notified & Live
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300">
                          <Clock className="w-3.5 h-3.5" />
                          Pending Launch
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {sub.created_at ? new Date(sub.created_at).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {sub.notified_at ? new Date(sub.notified_at).toLocaleString() : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {sub.status === 'notified' ? (
                        <button
                          type="button"
                          onClick={() => handleResetStatus(sub.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[11px] font-medium transition-colors border border-amber-500/20"
                          title="Reset to Pending to allow re-notifying"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset to Pending</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500">Ready</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
