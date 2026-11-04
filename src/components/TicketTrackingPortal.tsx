import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LifeBuoy,
  KeyRound,
  Send,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  Eye,
  ArrowLeft,
  RotateCcw,
  RefreshCw,
  X,
  Trash2,
} from 'lucide-react';
import logoImg from '../assets/kivo-logo.png';
import type { SupportTicket, SupportTicketAttachment } from '../types/cms';

interface TicketTrackingPortalProps {
  initialTicketId?: string;
  onNavigateHome: () => void;
}

export const TicketTrackingPortal: React.FC<TicketTrackingPortalProps> = ({
  initialTicketId = '',
  onNavigateHome,
}) => {
  // Step: 'input' | 'otp' | 'view'
  const [ticketIdInput, setTicketIdInput] = useState(initialTicketId);
  const [emailInput, setEmailInput] = useState('');
  const [otpInput, setOtpInput] = useState('');

  const [step, setStep] = useState<'input' | 'otp' | 'view'>('input');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [customerToken, setCustomerToken] = useState<string>('');

  // Reply state
  const [replyText, setReplyText] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<
    Array<{ file: File; name: string; size: number; progress: number; data?: SupportTicketAttachment }>
  >([]);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // File preview modal
  const [previewAttachment, setPreviewAttachment] = useState<SupportTicketAttachment | null>(null);

  // Check URL parameters on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paramId = urlParams.get('ticketId') || initialTicketId;
    const paramToken = urlParams.get('token');

    if (paramId) {
      setTicketIdInput(paramId);
      if (paramToken) {
        // Attempt magic link verification directly
        handleVerifyWithMagicToken(paramId, paramToken);
      } else {
        // Check if an existing session cookie allows viewing
        checkExistingSession(paramId);
      }
    }
  }, []);

  const checkExistingSession = async (id: string) => {
    try {
      const res = await fetch(`/api/support/ticket/${encodeURIComponent(id)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.ticket) {
          setTicket(data.ticket);
          setStep('view');
        }
      }
    } catch {
      // ignore
    }
  };

  const handleVerifyWithMagicToken = async (id: string, token: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/support/track/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: id, otpOrToken: token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Magic link is invalid or expired.');

      setTicket(data.ticket);
      setCustomerToken(data.customerToken);
      setStep('view');
    } catch (err: any) {
      setErrorMessage(err.message || 'Magic link verification failed.');
      setStep('input');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (!ticketIdInput.trim() || !emailInput.trim()) {
      setErrorMessage('Please provide both your Ticket ID and registered email address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/support/track/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: ticketIdInput.trim().toUpperCase(),
          email: emailInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification request rejected.');
      }

      setInfoMessage(data.message || 'Verification code sent to your email.');
      setStep('otp');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to request verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!otpInput.trim()) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/support/track/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: ticketIdInput.trim().toUpperCase(),
          email: emailInput.trim(),
          otpOrToken: otpInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid verification code.');
      }

      setTicket(data.ticket);
      setCustomerToken(data.customerToken);
      setStep('view');
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Upload attachment file for customer reply
  const uploadReplyFile = async (file: File): Promise<SupportTicketAttachment> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/support/upload', true);
      xhr.setRequestHeader('x-filename', encodeURIComponent(file.name));
      xhr.setRequestHeader('x-filetype', file.type || 'application/octet-stream');

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setReplyAttachments((prev) =>
            prev.map((att) => (att.file === file ? { ...att, progress: percent } : att))
          );
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.success && data.attachment) {
              setReplyAttachments((prev) =>
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

  const handleReplyFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newItems = files.map((f) => ({
      file: f,
      name: f.name,
      size: f.size,
      progress: 0,
    }));

    setReplyAttachments((prev) => [...prev, ...newItems]);

    for (const item of newItems) {
      try {
        await uploadReplyFile(item.file);
      } catch {
        // error logged in UI
      }
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !replyText.trim()) return;

    setIsSubmittingReply(true);
    try {
      const readyAttachments = replyAttachments
        .map((a) => a.data)
        .filter(Boolean) as SupportTicketAttachment[];

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (customerToken) {
        headers['x-ticket-token'] = customerToken;
      }

      const res = await fetch(`/api/support/ticket/${encodeURIComponent(ticket.id)}/reply`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text: replyText.trim(),
          attachments: readyAttachments,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit response.');

      setTicket(data.ticket);
      setReplyText('');
      setReplyAttachments([]);
    } catch (err: any) {
      alert(err.message || 'Error posting response.');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; border: string }> = {
      Open: { bg: 'bg-kivo-blue/15', text: 'text-kivo-cyan', border: 'border-kivo-cyan/30' },
      Reopened: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
      'In Progress': { bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-purple-500/30' },
      'Waiting for Customer': { bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30' },
      Closed: { bg: 'bg-slate-700/30', text: 'text-slate-400', border: 'border-slate-600/30' },
    };
    const s = map[status] || map.Open;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border ${s.bg} ${s.text} ${s.border}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-kivo-bg text-slate-100 flex flex-col font-sans relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-gradient-to-tr from-kivo-blue/15 via-kivo-cyan/10 to-kivo-purple/15 blur-[140px] rounded-full pointer-events-none -z-10" />

      {/* Header */}
      <header className="px-6 py-5 border-b border-white/[0.08] bg-[#070B14]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="KIVO" className="w-8 h-8 object-contain" />
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white font-display">KIVO Support</span>
              <span className="text-xs text-kivo-cyan font-mono">• Ticket Portal</span>
            </div>
          </div>

          <button
            onClick={onNavigateHome}
            type="button"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white border border-white/[0.08] transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Site</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 flex-grow w-full">
        {step !== 'view' ? (
          /* Step 1 & 2: Verification Screen */
          <div className="max-w-md mx-auto py-8">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl bg-gradient-to-b from-[#0F1628]/90 via-[#0A0F1D]/90 to-[#070B14]/95 border border-white/[0.1] p-8 sm:p-10 backdrop-blur-2xl shadow-2xl relative overflow-hidden"
            >
              <div className="text-center mb-8">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-kivo-blue/20 to-kivo-cyan/20 border border-kivo-cyan/30 flex items-center justify-center text-kivo-cyan shadow-lg mb-4">
                  <LifeBuoy className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-extrabold text-white font-display tracking-tight">
                  Track Your Ticket
                </h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Enter your Ticket ID and verify your registered email address to securely access your conversation.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {infoMessage && (
                <div className="mb-6 p-3.5 rounded-xl bg-kivo-blue/15 border border-kivo-cyan/30 text-kivo-cyan text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-kivo-cyan shrink-0" />
                  <span>{infoMessage}</span>
                </div>
              )}

              {step === 'input' ? (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Ticket Reference ID
                    </label>
                    <input
                      type="text"
                      required
                      value={ticketIdInput}
                      onChange={(e) => setTicketIdInput(e.target.value.toUpperCase())}
                      placeholder="e.g. KIVO-2026-A8X92P"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-kivo-cyan"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Registered Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="alex@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-kivo-cyan"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-kivo-blue via-kivo-cyan to-kivo-purple font-semibold text-white text-xs shadow-lg shadow-kivo-blue/20 hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Sending Verification Code...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Send Verification Code</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Enter 6-Digit Code
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.trim())}
                      placeholder="e.g. 482910"
                      className="w-full px-3.5 py-3 rounded-xl bg-black/40 border border-white/10 text-center font-mono font-bold text-lg tracking-widest text-kivo-cyan focus:outline-none focus:border-kivo-cyan"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-kivo-blue via-kivo-cyan to-kivo-purple font-semibold text-white text-xs shadow-lg shadow-kivo-blue/20 hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Unlocking Ticket...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Verify & Open Ticket</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep('input')}
                    className="w-full py-2 text-center text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    Use different Ticket ID or email
                  </button>
                </form>
              )}

              <div className="mt-6 pt-4 border-t border-white/[0.08] text-center">
                <span className="text-[11px] text-slate-500">
                  Protected by encrypted email ownership authentication (IDOR Shielded).
                </span>
              </div>
            </motion.div>
          </div>
        ) : (
          /* Step 3: Verified Ticket Conversation View */
          ticket && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {/* Top Ticket Header Banner */}
              <div className="p-6 rounded-3xl bg-gradient-to-b from-[#0F1628]/95 to-[#070B14]/98 border border-white/10 backdrop-blur-2xl shadow-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-mono font-bold text-kivo-cyan">
                        {ticket.id}
                      </span>
                      {getStatusBadge(ticket.status)}
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white font-display">
                      {ticket.subject}
                    </h1>
                  </div>

                  <button
                    onClick={() => {
                      setStep('input');
                      setTicket(null);
                    }}
                    type="button"
                    className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 border border-white/10 transition-colors"
                  >
                    Exit Ticket
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400 pt-2 border-t border-white/[0.06]">
                  <div>Category: <span className="text-white font-medium">{ticket.category}</span></div>
                  <div>Submitted: <span className="text-white font-medium">{new Date(ticket.createdAt).toLocaleString()}</span></div>
                  <div>Registered Email: <span className="text-slate-300 font-mono">{ticket.email}</span></div>
                </div>
              </div>

              {/* CLOSED TICKET REOPENING BANNER */}
              {ticket.status === 'Closed' && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-200">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                    <span>
                      <strong>This ticket is currently Closed.</strong> If you still need help or have follow-up questions, send a new message below to automatically reopen this ticket.
                    </span>
                  </div>
                </div>
              )}

              {/* Conversation Messages Thread */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                  Conversation Thread ({ticket.messages.length} messages)
                </h3>

                <div className="space-y-4">
                  {ticket.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-5 rounded-3xl border transition-all ${
                        msg.senderType === 'admin'
                          ? 'bg-kivo-blue/10 border-kivo-blue/30 text-white ml-2 sm:ml-8'
                          : 'bg-white/[0.03] border-white/10 text-slate-200 mr-2 sm:mr-8'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06] mb-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${msg.senderType === 'admin' ? 'text-kivo-cyan' : 'text-white'}`}>
                            {msg.sender}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300 font-mono">
                            {msg.senderType === 'admin' ? 'KIVO Staff' : 'Customer'}
                          </span>
                        </div>
                        <span className="text-slate-400 text-[11px]">
                          {new Date(msg.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                        {msg.text}
                      </p>

                      {/* Attachments if any */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-white/[0.06] space-y-2">
                          <span className="text-[11px] font-semibold text-slate-400 block">
                            Shared Attachments:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {msg.attachments.map((att) => (
                              <div
                                key={att.filename}
                                className="inline-flex items-center gap-2 p-2 rounded-xl bg-black/40 border border-white/10 text-xs"
                              >
                                <FileText className="w-3.5 h-3.5 text-kivo-cyan" />
                                <span className="text-slate-200 max-w-[150px] truncate" title={att.originalName}>
                                  {att.originalName}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  ({(att.size / 1024).toFixed(1)} KB)
                                </span>

                                <div className="flex items-center gap-1 ml-1">
                                  {/* Preview button if image or PDF */}
                                  {(att.mimeType.startsWith('image/') || att.mimeType === 'application/pdf') && (
                                    <button
                                      type="button"
                                      onClick={() => setPreviewAttachment(att)}
                                      className="p-1 text-slate-400 hover:text-kivo-cyan transition-colors"
                                      title="Preview"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  <a
                                    href={`/api/support/ticket/${encodeURIComponent(ticket.id)}/attachment/${encodeURIComponent(att.filename)}${customerToken ? `?token=${encodeURIComponent(customerToken)}` : ''}`}
                                    download
                                    className="p-1 text-slate-400 hover:text-white transition-colors"
                                    title="Download"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Reply Box (Allows sending new message and reopening closed ticket) */}
              <div className="p-6 rounded-3xl bg-gradient-to-b from-[#0F1628]/90 to-[#070B14]/95 border border-white/10 shadow-xl">
                <form onSubmit={handleSendReply} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white uppercase tracking-wider">
                      {ticket.status === 'Closed' ? 'Reopen Ticket / Send New Message' : 'Send a Reply to KIVO Support'}
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Replies are received directly by our engineers.
                    </span>
                  </div>

                  <textarea
                    rows={4}
                    required
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={
                      ticket.status === 'Closed'
                        ? 'Describe any further problem or update to reopen this ticket...'
                        : 'Write your follow-up message or provide additional details...'
                    }
                    className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-kivo-cyan resize-none"
                  />

                  {/* Multiple Attachments in Reply */}
                  <div>
                    {replyAttachments.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {replyAttachments.map((att, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between text-xs"
                          >
                            <span className="truncate max-w-[250px] text-slate-200">{att.name}</span>
                            <div className="flex items-center gap-2">
                              {att.data ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <span className="text-[10px] font-mono text-kivo-cyan">{att.progress}%</span>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setReplyAttachments((prev) => prev.filter((_, i) => i !== idx))
                                }
                                className="text-slate-400 hover:text-rose-400"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-dashed border-white/20 hover:border-kivo-cyan/50 hover:bg-white/[0.02] cursor-pointer text-xs text-slate-300 transition-colors">
                      <Paperclip className="w-3.5 h-3.5 text-kivo-cyan" />
                      <span>Attach files to reply</span>
                      <input
                        type="file"
                        multiple
                        onChange={handleReplyFilesSelected}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingReply || replyAttachments.some((a) => !a.data)}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-kivo-blue via-kivo-cyan to-kivo-purple text-white text-xs font-bold shadow-lg shadow-kivo-blue/20 hover:opacity-95 transition-opacity flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSubmittingReply ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Sending Message...</span>
                        </>
                      ) : ticket.status === 'Closed' ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reopen & Send Message</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Post Reply</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )
        )}
      </main>

      {/* Attachment Preview Modal */}
      {previewAttachment && ticket && (
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
                  src={`/api/support/ticket/${encodeURIComponent(ticket.id)}/attachment/${encodeURIComponent(previewAttachment.filename)}${customerToken ? `?token=${encodeURIComponent(customerToken)}` : ''}&preview=true`}
                  alt={previewAttachment.originalName}
                  className="max-h-[65vh] object-contain rounded-lg"
                />
              ) : (
                <iframe
                  src={`/api/support/ticket/${encodeURIComponent(ticket.id)}/attachment/${encodeURIComponent(previewAttachment.filename)}${customerToken ? `?token=${encodeURIComponent(customerToken)}` : ''}&preview=true`}
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
