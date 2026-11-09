import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Users,
  Download,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { WindowsIcon, AppleIcon } from '../Hero';

interface AnalyticsData {
  users: {
    total: number;
    active: number;
    suspended: number;
  };
  tickets: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
  };
  installers: {
    windows: { available: boolean; version: string | null };
    macArm: { available: boolean; version: string | null };
    macIntel: { available: boolean; version: string | null };
  };
  downloads: {
    total: number;
  };
}

interface AdminAnalyticsTabProps {
  csrfToken: string;
}

export const AdminAnalyticsTab: React.FC<AdminAnalyticsTabProps> = ({ csrfToken }) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/analytics', {
        headers: { 'X-CSRF-Token': csrfToken },
      });
      const json = await res.json();
      if (json.analytics) {
        setData(json.analytics);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white font-display flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-kivo-cyan" />
            <span>Platform Analytics & Telemetry</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Aggregated operational metrics from live database and persistent storage. Zero fabricated metrics.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAnalytics}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-xs font-medium text-slate-300 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-kivo-cyan' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Registered Users</span>
            <Users className="w-5 h-5 text-kivo-cyan" />
          </div>
          <div className="text-3xl font-extrabold text-white font-display">
            {data ? data.users.total : '—'}
          </div>
          <div className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1 font-mono">
            <CheckCircle2 className="w-3 h-3" />
            <span>{data ? data.users.active : 0} active accounts</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Downloads</span>
            <Download className="w-5 h-5 text-kivo-blue" />
          </div>
          <div className="text-3xl font-extrabold text-white font-display">
            {data ? data.downloads.total : '—'}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-mono">
            Verified download sessions
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Open Tickets</span>
            <AlertCircle className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400 font-display">
            {data ? data.tickets.open : '—'}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-mono">
            {data ? data.tickets.inProgress : 0} currently in progress
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Resolved Tickets</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 font-display">
            {data ? data.tickets.resolved : '—'}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 font-mono">
            {data ? data.tickets.total : 0} total tickets logged
          </div>
        </div>
      </div>

      {/* Platform Binary Distribution */}
      <div className="p-6 rounded-3xl bg-black/40 border border-white/[0.08]">
        <h3 className="text-base font-bold text-white font-display mb-4 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-kivo-cyan" />
          <span>Desktop Installer Binary Availability</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <WindowsIcon className="w-5 h-5 text-kivo-cyan" />
              <div>
                <div className="text-xs font-bold text-white">Windows (x64)</div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {data?.installers.windows.version ? `v${data.installers.windows.version}` : 'No binary uploaded'}
                </div>
              </div>
            </div>
            {data?.installers.windows.available ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Online
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Pending
              </span>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AppleIcon className="w-5 h-5 text-white" />
              <div>
                <div className="text-xs font-bold text-white">macOS Apple Silicon</div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {data?.installers.macArm.version ? `v${data.installers.macArm.version}` : 'No binary uploaded'}
                </div>
              </div>
            </div>
            {data?.installers.macArm.available ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Online
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Pending
              </span>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AppleIcon className="w-5 h-5 text-slate-300" />
              <div>
                <div className="text-xs font-bold text-white">macOS Intel 64-bit</div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {data?.installers.macIntel.version ? `v${data.installers.macIntel.version}` : 'No binary uploaded'}
                </div>
              </div>
            </div>
            {data?.installers.macIntel.available ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Online
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Pending
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
