import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Mail,
} from 'lucide-react';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'suspended';
  createdAt: string;
  lastLoginAt: string;
  downloadCount: number;
}

interface AdminUsersTabProps {
  csrfToken: string;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({ csrfToken }) => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'X-CSRF-Token': csrfToken },
      });
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (user: UserRecord) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    setActionLoading(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
        );
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white font-display flex items-center gap-2">
            <Users className="w-6 h-6 text-kivo-cyan" />
            <span>Registered Customer Accounts</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Review user profiles, monitor login activity, manage role-based access, and suspend or activate accounts.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchUsers}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-xs font-medium text-slate-300 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-kivo-cyan' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Total Registered</span>
          <span className="text-2xl font-extrabold text-white mt-1 block">{users.length}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Active Users</span>
          <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">
            {users.filter((u) => u.status === 'active').length}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Suspended</span>
          <span className="text-2xl font-extrabold text-rose-400 mt-1 block">
            {users.filter((u) => u.status === 'suspended').length}
          </span>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, email, or user ID..."
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-kivo-cyan"
        />
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-white/[0.08] overflow-hidden bg-black/30">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-white/[0.04] text-[11px] uppercase font-semibold text-slate-400 border-b border-white/[0.08]">
              <tr>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    {isLoading ? 'Loading users...' : 'No customer accounts registered yet.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{u.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-500" />
                        <span>{u.email}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono uppercase text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.1] text-slate-300">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {u.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Suspended
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(u.lastLoginAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        disabled={actionLoading === u.id}
                        onClick={() => handleToggleStatus(u)}
                        className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                          u.status === 'active'
                            ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {actionLoading === u.id
                          ? 'Updating...'
                          : u.status === 'active'
                          ? 'Suspend Account'
                          : 'Activate Account'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
