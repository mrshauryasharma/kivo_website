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
  Eye,
  RotateCcw,
  X,
  Trash2,
} from 'lucide-react';
import type { SupportTicket, SupportTicketAttachment } from '../../types/cms';

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
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Reply state
  const [replyText, setReplyText] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [adminAttachments, setAdminAttachments] = useState<
    Array<{ file: File; name: string; size: number; progress: number; data?: SupportTicketAttachment }>
  >([]);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Note state
  const [noteText, setNoteText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const [statusUpdating, setStatusUpdating] = useState(false);

  // Attachment preview
  const [previewAttachment, setPreviewAttachment] = useState<SupportTicketAttachment | null>(null);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter && categoryFilter !== 'all') params.append('category', categoryFilter);
      if (priorityFilter && priorityFilter !== 'all') params.append('priority', priorityFilter);

      const res = await fetch(`/api/admin/tickets?${params.toString()}`, {
        headers: { 'X-CSRF-Token': csrfToken },
      });

      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
        setStats(data.stats || {});
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
  }, [statusFilter, categoryFilter, priorityFilter]);

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
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update ticket status.');
      }
    } catch {
      alert('Failed to update ticket status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    if (!selectedTicket) return;
    try {
      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}/priority`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ priority: newPriority }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedTicket(data.ticket);
        fetchTickets();
      }
    } catch {
      alert('Failed to update priority.');
    }
  };

  const handleAssigneeChange = async (newAssignee: string) => {
    if (!selectedTicket) return;
    try {
      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}/assignee`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ assignee: newAssignee }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedTicket(data.ticket);
        fetchTickets();
      }
    } catch {
      alert('Failed to update assignee.');
    }
  };

  // Upload admin reply attachment
  const uploadAdminFile = async (file: File): Promise<SupportTicketAttachment> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/admin/upload-attachment', true);
      xhr.setRequestHeader('X-CSRF-Token', csrfToken);
      xhr.setRequestHeader('x-filename', encodeURIComponent(file.name));
      xhr.setRequestHeader('x-filetype', file.type || 'application/octet-stream');

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setAdminAttachments((prev) =>
            prev.map((att) => (att.file === file ? { ...att, progress: percent } : att))
          );
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.success && data.attachment) {
              setAdminAttachments((prev) =>
                prev.map((att) =>
                  att.file === file ? { ...att, progress: 100, data: data.attachment } : att
                )
              );
              resolve(data.attachment);
            } else {
              reject(new Error(data.error || 'Upload error'));
            }
          } catch {
            reject(new Error('Invalid response'));
          }
        } else {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send(file);
    });
  };

  const handleAdminFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newItems = files.map((f) => ({
      file: f,
      name: f.name,
      size: f.size,
      progress: 0,
    }));

    setAdminAttachments((prev) => [...prev, ...newItems]);

    for (const item of newItems) {
      try {
        await uploadAdminFile(item.file);
      } catch {
        // error handled
      }
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setIsSubmittingReply(true);
    try {
      const readyAttachments = adminAttachments
        .map((a) => a.data)
        .filter(Boolean) as SupportTicketAttachment[];

      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          text: replyText.trim(),
          attachments: readyAttachments,
          sendEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit reply');

      setReplyText('');
      setAdminAttachments([]);
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

  const handleRetryEmail = async (emailLogId: string) => {
    if (!selectedTicket) return;
    try {
      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}/retry-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ emailLogId }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.emailLog.status === 'delivered' ? 'Email delivered successfully!' : 'Email delivery failed again.');
        handleSelectTicket(selectedTicket);
      } else {
        alert(data.error || 'Retry failed');
      }
    } catch {
      alert('Network error while retrying email delivery.');
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      Open: 'bg-kivo-blue/20 text-kivo-cyan border-kivo-cyan/30',
      Reopened: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      'In Progress': 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      'Waiting for Customer': 'bg-blue-500/15 text-blue-300 border-blue-500/30',
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
          { label: 'Open', val: stats.open || 0, color: 'text-kivo-cyan' },
          { label: 'Reopened', val: stats.reopened || 0, color: 'text-amber-400' },
          { label: 'In Progress', val: stats.inProgress || 0, color: 'text-purple-400' },
          { label: 'Waiting on User', val: stats.waiting || 0, color: 'text-blue-400' },
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
            placeholder="Search by Ticket ID (e.g. KIVO-2026-A8X92P), customer name, email, or subject..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-kivo-cyan"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-kivo-cyan"
          >
            <option value="all">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Waiting for Customer">Waiting for Customer</option>
            <option value="Waiting for Support">Waiting for Support</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-kivo-cyan"
          >
            <option value="all">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Normal">Normal</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-kivo-cyan"
          >
            <option value="all">All Categories</option>
            <option value="Bug Report">Bug Report</option>
            <option value="Installation Issue">Installation Issue</option>
            <option value="Download Problem">Download Problem</option>
            <option value="Browser Issue">Browser Issue</option>
            <option value="Feature Request">Feature Request</option>
            <option value="General Feedback">General Feedback</option>
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
              <p className="text-xs text-slate-400">No support tickets match the selected filters.</p>
            </div>
          ) : (
            tickets.map((t) => {
              const isSelected = selectedTicket?.id === t.id;
              const hasAttachments = (t.messages || []).some(
                (m) => m.attachments && m.attachments.length > 0
              );

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
                    <span className="truncate max-w-[150px] font-medium text-slate-300">{t.name}</span>
                    <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="px-2 py-0.5 rounded bg-white/[0.04]">{t.category}</span>
                    {hasAttachments && (
                      <span className="inline-flex items-center gap-1 text-kivo-cyan">
                        <Paperclip className="w-3 h-3" />
                        <span>Has Attachments</span>
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

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">Status:</span>
                    <select
                      disabled={statusUpdating}
                      value={selectedTicket.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="px-2.5 py-1 rounded-xl bg-black/40 border border-white/20 text-xs text-white focus:outline-none focus:border-kivo-cyan"
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Waiting for Customer">Waiting for Customer</option>
                      <option value="Waiting for Support">Waiting for Support</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">Priority:</span>
                    <select
                      value={selectedTicket.priority || 'Normal'}
                      onChange={(e) => handlePriorityChange(e.target.value)}
                      className="px-2.5 py-1 rounded-xl bg-black/40 border border-white/20 text-xs text-white focus:outline-none focus:border-kivo-cyan"
                    >
                      <option value="Low">Low</option>
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">Assignee:</span>
                    <select
                      value={selectedTicket.assignee || 'Unassigned'}
                      onChange={(e) => handleAssigneeChange(e.target.value)}
                      className="px-2.5 py-1 rounded-xl bg-black/40 border border-white/20 text-xs text-white focus:outline-none focus:border-kivo-cyan"
                    >
                      <option value="Unassigned">Unassigned</option>
                      <option value="KIVO Support Lead">KIVO Support Lead</option>
                      <option value="Tier 2 Engineering">Tier 2 Engineering</option>
                      <option value="Security Team">Security Team</option>
                      <option value="QA Team">QA Team</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Customer Details Card */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Customer</span>
                  <span className="font-semibold text-white">{selectedTicket.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Email</span>
                  <a
                    href={`mailto:${selectedTicket.email}`}
                    className="font-semibold text-kivo-cyan hover:underline truncate block"
                  >
                    {selectedTicket.email}
                  </a>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Mandatory Mobile</span>
                  <a
                    href={`tel:${selectedTicket.phone}`}
                    className="font-mono font-bold text-emerald-400 hover:underline block"
                  >
                    {selectedTicket.phone || 'Missing'}
                  </a>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Priority & Assignee</span>
                  <span className="text-slate-200">
                    {selectedTicket.priority || 'Normal'} • {selectedTicket.assignee || 'Unassigned'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Created / Active</span>
                  <span className="text-slate-300 text-[11px]">
                    {new Date(selectedTicket.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Conversation Messages Thread */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Conversation Thread ({selectedTicket.messages.length} messages)
                </span>

                <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
                  {selectedTicket.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`p-4 rounded-2xl text-xs space-y-2 ${
                        m.senderType === 'admin'
                          ? 'bg-kivo-blue/15 border border-kivo-blue/30 ml-6 text-white'
                          : 'bg-white/[0.04] border border-white/10 mr-6 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white">{m.sender}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 font-mono">
                            {m.senderType === 'admin' ? 'Staff' : 'Customer'}
                          </span>
                        </div>
                        <span>{new Date(m.timestamp).toLocaleString()}</span>
                      </div>

                      <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>

                      {/* Message Attachments */}
                      {m.attachments && m.attachments.length > 0 && (
                        <div className="pt-2 border-t border-white/[0.08] flex flex-wrap gap-2">
                          {m.attachments.map((att) => (
                            <div
                              key={att.filename}
                              className="inline-flex items-center gap-2 p-1.5 px-2.5 rounded-lg bg-black/40 border border-white/10 text-[11px]"
                            >
                              <FileText className="w-3.5 h-3.5 text-kivo-cyan" />
                              <span className="max-w-[140px] truncate" title={att.originalName}>
                                {att.originalName}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                ({(att.size / 1024).toFixed(1)} KB)
                              </span>

                              <div className="flex items-center gap-1 ml-1">
                                {(att.mimeType.startsWith('image/') || att.mimeType === 'application/pdf') && (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewAttachment(att)}
                                    className="p-1 text-slate-400 hover:text-kivo-cyan"
                                    title="Preview"
                                  >
                                    <Eye className="w-3 h-3" />
                                  </button>
                                )}
                                <a
                                  href={`/api/admin/tickets/${selectedTicket.id}/attachment/${att.filename}`}
                                  download
                                  className="p-1 text-slate-400 hover:text-white"
                                  title="Download"
                                >
                                  <Download className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Email Status Indicator */}
                      {m.senderType === 'admin' && (
                        <div className="pt-1 text-[10px] text-slate-400 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-kivo-cyan" />
                          <span>
                            {m.emailStatus === 'delivered'
                              ? 'Dispatched to customer email via Resend'
                              : m.emailStatus === 'failed'
                              ? 'Email failed to send'
                              : 'Logged locally (Resend unconfigured)'}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin Reply Form */}
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
                  placeholder="Type your official response to the customer..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-kivo-cyan resize-none"
                />

                {/* Multiple Attachments in Admin Reply */}
                <div>
                  {adminAttachments.length > 0 && (
                    <div className="space-y-1.5 mb-2">
                      {adminAttachments.map((att, idx) => (
                        <div key={idx} className="flex items-center justify-between p-1.5 rounded bg-white/[0.04] text-[11px]">
                          <span className="truncate max-w-[200px] text-slate-200">{att.name}</span>
                          <button
                            type="button"
                            onClick={() => setAdminAttachments((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-rose-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <label className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white cursor-pointer">
                      <Paperclip className="w-3.5 h-3.5 text-kivo-cyan" />
                      <span>Attach files to reply</span>
                      <input
                        type="file"
                        multiple
                        onChange={handleAdminFilesSelected}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={isSubmittingReply || adminAttachments.some((a) => !a.data)}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-kivo-blue to-kivo-cyan text-white text-xs font-bold hover:opacity-95 transition-opacity flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmittingReply ? 'Sending...' : 'Send Reply'}</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Email Delivery Logs & Retry Section */}
              {(selectedTicket.emailLogs || []).length > 0 && (
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Email Delivery Logs
                  </span>
                  <div className="max-h-24 overflow-y-auto space-y-1">
                    {selectedTicket.emailLogs?.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-1.5 rounded bg-black/40 text-[10px]">
                        <span className="truncate text-slate-300 max-w-[250px]">{log.subject}</span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-bold ${
                              log.status === 'delivered' ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {log.status}
                          </span>
                          {log.status === 'failed' && (
                            <button
                              type="button"
                              onClick={() => handleRetryEmail(log.id)}
                              className="text-kivo-cyan hover:underline flex items-center gap-1"
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                              <span>Retry</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Internal Staff Notes */}
              <div className="pt-3 border-t border-white/10 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Internal Staff Notes (Staff Only)</span>
                </div>

                {(selectedTicket.internalNotes || []).length > 0 && (
                  <div className="space-y-1.5 max-h-28 overflow-y-auto">
                    {selectedTicket.internalNotes?.map((n) => (
                      <div key={n.id} className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                        <div className="flex items-center justify-between text-[10px] text-amber-400 mb-0.5">
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
                    placeholder="Add an internal note visible only to staff..."
                    className="flex-1 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingNote}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-200 transition-colors disabled:opacity-50"
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

      {/* Attachment Preview Modal for Admin */}
      {previewAttachment && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-3xl bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <span className="text-xs font-bold text-white truncate max-w-sm">
                {previewAttachment.originalName}
              </span>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-center max-h-[70vh] overflow-auto">
              {previewAttachment.mimeType.startsWith('image/') ? (
                <img
                  src={`/api/admin/tickets/${selectedTicket.id}/attachment/${previewAttachment.filename}?preview=true`}
                  alt={previewAttachment.originalName}
                  className="max-h-[65vh] object-contain rounded-lg"
                />
              ) : (
                <iframe
                  src={`/api/admin/tickets/${selectedTicket.id}/attachment/${previewAttachment.filename}?preview=true`}
                  className="w-full h-[65vh] rounded-lg"
                  title="Document Preview"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
