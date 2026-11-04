import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  Search,
  RefreshCw,
  Mail,
  Paperclip,
  Download,
  Send,
  Lock,
  FileText,
} from 'lucide-react';
import type { SupportTicket } from '../../types/cms';

interface AdminTicketsTabProps {
  csrfToken: string;
}

export const AdminTicketsTab: React.FC<AdminTicketsTabProps> = ({ csrfToken }) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [replyText, setReplyText] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const [noteText, setNoteText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const [statusUpdating, setStatusUpdating] = useState(false);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter && categoryFilter !== 'all') params.append('category', categoryFilter);

      const res = await fetch(`/api/admin/tickets?${params.toString()}`, {
        headers: { 'X-CSRF-Token': csrfToken },
      });

      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
        setStats(data.stats || {});
        // Update selected ticket if currently viewing
        if (selectedTicket) {
          const updated = (data.tickets || []).find((t: SupportTicket) => t.id === selectedTicket.id);
          if (updated) setSelectedTicket(updated);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTickets();
  };

  const handleSelectTicket = async (ticket: SupportTicket) => {
    try {
      const res = await fetch(`/api/admin/tickets/${ticket.id}`, {
        headers: { 'X-CSRF-Token': csrfToken },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedTicket(data.ticket);
      } else {
        setSelectedTicket(ticket);
      }
    } catch {
      setSelectedTicket(ticket);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedTicket) return;
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedTicket(data.ticket);
        fetchTickets();
      }
    } catch {
      alert('Failed to update ticket status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setIsSubmittingReply(true);
    try {
      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ text: replyText.trim(), sendEmail }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit reply');

      setReplyText('');
      // Reload ticket details
      handleSelectTicket(selectedTicket);
      fetchTickets();
    } catch (err: any) {
      alert(err.message || 'Error posting reply.');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !noteText.trim()) return;

    setIsSubmittingNote(true);
    try {
      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}/note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ text: noteText.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add internal note');

      setNoteText('');
      handleSelectTicket(selectedTicket);
      fetchTickets();
    } catch (err: any) {
      alert(err.message || 'Error adding note.');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      New: 'bg-kivo-blue/20 text-kivo-cyan border-kivo-cyan/30',
      Open: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      'In Progress': 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      'Waiting for Customer': 'bg-blue-500/15 text-blue-300 border-blue-500/30',
      Resolved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      Closed: 'bg-slate-700/30 text-slate-400 border-slate-600/30',
    };
    return (
      <span
        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border font-mono ${
          map[status] || map.Closed
        }`}
      >
        {status}
      </span>
    );
  };

  return (
    <div>
      {/* Top Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {[
          { label: 'Total Tickets', val: stats.total || 0, color: 'text-white' },
          { label: 'New', val: stats.new || 0, color: 'text-kivo-cyan' },
          { label: 'In Progress', val: stats.inProgress || 0, color: 'text-purple-400' },
          { label: 'Waiting', val: stats.waiting || 0, color: 'text-blue-400' },
          { label: 'Resolved', val: stats.resolved || 0, color: 'text-emerald-400' },
          { label: 'Closed', val: stats.closed || 0, color: 'text-slate-400' },
        ].map((s) => (
          <div key={s.label} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
            <span className="text-[11px] text-slate-400 block mb-1">{s.label}</span>
            <span className={`text-2xl font-bold font-mono ${s.color}`}>{s.val}</span>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="mb-6 flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Ticket ID, Customer Name, Email, or Subject..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-kivo-cyan"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-kivo-cyan"
          >
            <option value="all">All Statuses</option>
            <option value="New">New</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Waiting for Customer">Waiting for Customer</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-kivo-cyan"
          >
            <option value="all">All Categories</option>
            <option value="Bug report">Bug report</option>
            <option value="Installation problem">Installation problem</option>
            <option value="Download problem">Download problem</option>
            <option value="Browser issue">Browser issue</option>
            <option value="Feature request">Feature request</option>
            <option value="General feedback">General feedback</option>
            <option value="Other">Other</option>
          </select>

          <button
            type="button"
            onClick={fetchTickets}
            className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white transition-colors"
            title="Refresh tickets"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-kivo-cyan' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Tickets Content: List & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Tickets List */}
        <div className="lg:col-span-5 space-y-3 max-h-[750px] overflow-y-auto pr-1">
          {tickets.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-white/[0.08]">
              <LifeBuoy className="w-8 h-8 mx-auto text-slate-500 mb-2" />
              <p className="text-xs text-slate-400">No support tickets match the filters.</p>
            </div>
          ) : (
            tickets.map((t) => {
              const isSelected = selectedTicket?.id === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => handleSelectTicket(t)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-kivo-blue/15 border-kivo-cyan/40 shadow-lg shadow-kivo-blue/10'
                      : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-kivo-cyan">{t.id}</span>
                    {getStatusBadge(t.status)}
                  </div>
                  <h4 className="text-xs font-bold text-white mb-1 truncate">{t.subject}</h4>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="truncate max-w-[150px]">{t.name}</span>
                    <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="px-2 py-0.5 rounded bg-white/[0.04]">{t.category}</span>
                    {t.attachment && (
                      <span className="inline-flex items-center gap-1 text-kivo-cyan">
                        <Paperclip className="w-3 h-3" />
                        <span>Attachment</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Ticket Detail Drawer */}
        <div className="lg:col-span-7 rounded-3xl bg-gradient-to-b from-[#0D1426]/90 to-[#070B14]/95 border border-white/[0.1] p-6 backdrop-blur-xl shadow-xl min-h-[600px] flex flex-col justify-between">
          {selectedTicket ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="pb-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono font-bold text-kivo-cyan">
                      {selectedTicket.id}
                    </span>
                    {getStatusBadge(selectedTicket.status)}
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">
                    {selectedTicket.subject}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Status:</span>
                  <select
                    disabled={statusUpdating}
                    value={selectedTicket.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="px-2.5 py-1 rounded-xl bg-black/40 border border-white/20 text-xs text-white focus:outline-none focus:border-kivo-cyan"
                  >
                    <option value="New">New</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Waiting for Customer">Waiting for Customer</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>

              {/* Customer Info Card */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Customer</span>
                  <span className="font-semibold text-white">{selectedTicket.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Email</span>
                  <a
                    href={`mailto:${selectedTicket.email}`}
                    className="font-semibold text-kivo-cyan hover:underline truncate block"
                  >
                    {selectedTicket.email}
                  </a>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Mobile Phone</span>
                  <span className="font-semibold text-white">
                    {selectedTicket.phone || 'Not provided'}
                  </span>
                </div>
              </div>

              {/* Attachment if present */}
              {selectedTicket.attachment && (
                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-xs text-slate-200">
                    <FileText className="w-4 h-4 text-kivo-cyan" />
                    <span>{selectedTicket.attachment.originalName}</span>
                    <span className="text-[10px] text-slate-400">
                      ({(selectedTicket.attachment.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <a
                    href={`/api/admin/tickets/${selectedTicket.id}/attachment`}
                    download
                    className="px-3 py-1 rounded-lg bg-kivo-blue/20 hover:bg-kivo-blue/30 text-kivo-cyan text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                </div>
              )}

              {/* Message Thread History */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Conversation Thread
                </span>

                <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
                  {selectedTicket.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3.5 rounded-2xl text-xs space-y-1.5 ${
                        m.senderType === 'admin'
                          ? 'bg-kivo-blue/15 border border-kivo-blue/30 ml-6 text-white'
                          : 'bg-white/[0.04] border border-white/10 mr-6 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-bold text-white">{m.sender}</span>
                        <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                      {m.senderType === 'admin' && (
                        <div className="pt-1 text-[10px] text-slate-400 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-kivo-cyan" />
                          <span>
                            {m.emailDelivered
                              ? 'Dispatched to customer email via Resend'
                              : 'Logged locally (Email delivery unconfigured/pending)'}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="space-y-3 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Post Reply to Customer
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                      className="rounded text-kivo-cyan bg-slate-900 border-white/20"
                    />
                    <span>Email customer via Resend</span>
                  </label>
                </div>

                <textarea
                  rows={3}
                  required
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your response to the customer..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-kivo-cyan resize-none"
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingReply}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-kivo-blue to-kivo-cyan text-white text-xs font-bold hover:opacity-95 transition-opacity flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmittingReply ? 'Sending...' : 'Send Reply'}</span>
                  </button>
                </div>
              </form>

              {/* Internal Staff Notes */}
              <div className="pt-4 border-t border-white/10 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Internal Staff Notes (Staff Only)</span>
                </div>

                {(selectedTicket.internalNotes || []).length > 0 && (
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {selectedTicket.internalNotes.map((n) => (
                      <div key={n.id} className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                        <div className="flex items-center justify-between text-[10px] text-amber-400 mb-1">
                          <span className="font-semibold">{n.author}</span>
                          <span>{new Date(n.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-amber-200">{n.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={handleAddNote} className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add an internal note visible only to administrators..."
                    className="flex-1 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingNote}
                    className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-200 transition-colors disabled:opacity-50"
                  >
                    Add Note
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
              <LifeBuoy className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-xs">Select a support ticket from the list to view its full conversation and respond.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
