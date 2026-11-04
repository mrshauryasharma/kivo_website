import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  LifeBuoy,
  Send,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  FileText,
  Trash2,
  ArrowRight,
  Upload,
} from 'lucide-react';
import logoImg from '../assets/kivo-logo.png';
import type { SupportTicketAttachment } from '../types/cms';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTrack?: (ticketId: string) => void;
  defaultCategory?: string;
}

const CATEGORIES = [
  'Bug Report',
  'Installation Issue',
  'Download Problem',
  'Browser Issue',
  'Feature Request',
  'General Feedback',
  'Other',
];

interface AttachmentUploadState {
  file: File;
  name: string;
  size: number;
  progress: number;
  isUploading: boolean;
  uploadedData?: SupportTicketAttachment;
  error?: string | null;
}

export const SupportModal: React.FC<SupportModalProps> = ({
  isOpen,
  onClose,
  onNavigateTrack,
  defaultCategory = 'Browser Issue',
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState(defaultCategory);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  
  const [attachments, setAttachments] = useState<AttachmentUploadState[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Success state
  const [createdTicket, setCreatedTicket] = useState<{
    id: string;
    subject: string;
    createdAt: string;
    status: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Upload individual attachment with progress
  const uploadSingleFile = async (file: File): Promise<SupportTicketAttachment> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/support/upload', true);
      xhr.setRequestHeader('x-filename', encodeURIComponent(file.name));
      xhr.setRequestHeader('x-filetype', file.type || 'application/octet-stream');

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setAttachments((prev) =>
            prev.map((att) => (att.file === file ? { ...att, progress: percent } : att))
          );
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.success && data.attachment) {
              setAttachments((prev) =>
                prev.map((att) =>
                  att.file === file
                    ? { ...att, isUploading: false, progress: 100, uploadedData: data.attachment }
                    : att
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
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.error || 'Upload rejected'));
          } catch {
            reject(new Error(`Upload failed (${xhr.status})`));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network connection failed'));
      xhr.send(file);
    });
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setFormError(null);

    const newItems: AttachmentUploadState[] = files.map((f) => ({
      file: f,
      name: f.name,
      size: f.size,
      progress: 0,
      isUploading: true,
    }));

    setAttachments((prev) => [...prev, ...newItems]);

    for (const item of newItems) {
      try {
        await uploadSingleFile(item.file);
      } catch (err: any) {
        setAttachments((prev) =>
          prev.map((att) =>
            att.file === item.file
              ? { ...att, isUploading: false, error: err.message || 'Upload failed' }
              : att
          )
        );
      }
    }
  };

  const handleRemoveAttachment = (fileToRemove: File) => {
    setAttachments((prev) => prev.filter((a) => a.file !== fileToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Ensure ongoing uploads complete
    if (attachments.some((a) => a.isUploading)) {
      setFormError('Please wait for all attachments to finish uploading.');
      return;
    }

    if (!name.trim() || !email.trim() || !subject.trim() || !description.trim()) {
      setFormError('Please fill out all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const readyAttachments = attachments
        .map((a) => a.uploadedData)
        .filter(Boolean) as SupportTicketAttachment[];

      const res = await fetch('/api/support/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          category,
          subject: subject.trim(),
          description: description.trim(),
          attachments: readyAttachments,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit support ticket.');
      }

      setCreatedTicket({
        id: data.ticketId,
        subject: subject.trim(),
        createdAt: new Date().toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
        status: 'Open',
      });
    } catch (err: any) {
      setFormError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setName('');
    setEmail('');
    setPhone('');
    setCategory('Browser Issue');
    setSubject('');
    setDescription('');
    setAttachments([]);
    setFormError(null);
    setCreatedTicket(null);
    onClose();
  };

  const handleCopyTicketId = () => {
    if (!createdTicket?.id) return;
    navigator.clipboard.writeText(createdTicket.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleTrackDirectly = () => {
    if (createdTicket?.id) {
      const id = createdTicket.id;
      handleReset();
      if (onNavigateTrack) {
        onNavigateTrack(id);
      } else {
        window.location.href = `/support/track?ticketId=${encodeURIComponent(id)}`;
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleReset}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 16 }}
          className="relative w-full max-w-2xl bg-gradient-to-b from-[#0F1628]/95 via-[#0A0F1E]/95 to-[#070B14]/98 border border-white/10 rounded-3xl shadow-2xl shadow-kivo-blue/15 overflow-hidden my-8 z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-kivo-blue/20 to-kivo-cyan/20 border border-kivo-cyan/30 flex items-center justify-center text-kivo-cyan">
                <LifeBuoy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-wide font-display">
                  KIVO Customer Support & Problem Report
                </h3>
                <p className="text-xs text-slate-400">
                  Our engineering team is here to assist you promptly.
                </p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {createdTicket ? (
              /* Success Page */
              <div className="py-6 text-center space-y-6">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#090D1A] to-[#121A2D] border border-kivo-cyan/30 flex items-center justify-center shadow-lg shadow-kivo-cyan/10">
                  <img src={logoImg} alt="KIVO" className="w-10 h-10 object-contain" />
                </div>

                <div className="space-y-1.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs font-semibold text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Your message has been received</span>
                  </span>
                  <h4 className="text-2xl font-extrabold text-white font-display pt-1">
                    Support Ticket Created
                  </h4>
                  <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                    The KIVO engineering team has received your inquiry and will review your request shortly. A confirmation email has been dispatched to your address.
                  </p>
                </div>

                {/* Ticket Details Summary Card */}
                <div className="p-5 rounded-2xl bg-black/40 border border-white/10 max-w-md mx-auto text-left space-y-3">
                  <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06]">
                    <span className="text-xs text-slate-400">Ticket Reference ID</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-bold text-kivo-cyan">
                        {createdTicket.id}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyTicketId}
                        className="p-1 text-slate-400 hover:text-white transition-colors"
                        title="Copy Ticket ID"
                      >
                        {copiedId ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Subject:</span>
                    <span className="font-semibold text-white truncate max-w-[220px]">
                      {createdTicket.subject}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Submission Date:</span>
                    <span className="text-slate-200">{createdTicket.createdAt}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Status:</span>
                    <span className="font-mono font-bold text-kivo-cyan">
                      {createdTicket.status}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleTrackDirectly}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-kivo-blue via-kivo-cyan to-kivo-purple text-white text-xs font-bold shadow-lg shadow-kivo-blue/20 hover:opacity-95 transition-opacity flex items-center justify-center gap-2"
                  >
                    <span>Track Your Ticket</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-slate-300 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              /* Ticket Form */
              <form onSubmit={handleSubmit} className="space-y-4">
                {formError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Full Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Mercer"
                      className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-kivo-cyan focus:ring-1 focus:ring-kivo-cyan"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Email Address <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@example.com"
                      className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-kivo-cyan focus:ring-1 focus:ring-kivo-cyan"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Mobile Number <span className="text-slate-500 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-kivo-cyan focus:ring-1 focus:ring-kivo-cyan"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Category <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-kivo-cyan focus:ring-1 focus:ring-kivo-cyan"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat} className="bg-slate-900 text-white">
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Subject <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief summary of the issue or feedback"
                    className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-kivo-cyan focus:ring-1 focus:ring-kivo-cyan"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Detailed Problem Description <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Please include details such as OS version, browser build, steps to reproduce, or any error messages..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-kivo-cyan focus:ring-1 focus:ring-kivo-cyan resize-none"
                  />
                </div>

                {/* Multiple Attachments Section */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Attachments <span className="text-slate-500 font-normal">(Images, screenshots, logs, documents, videos)</span>
                  </label>

                  {/* Attachment List */}
                  {attachments.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {attachments.map((att) => (
                        <div
                          key={att.name + att.size}
                          className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-kivo-cyan shrink-0" />
                            <span className="truncate text-white font-medium">{att.name}</span>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              ({(att.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {att.isUploading ? (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-kivo-cyan">
                                  {att.progress}%
                                </span>
                                <div className="w-12 h-1 rounded-full bg-white/10 overflow-hidden">
                                  <div
                                    className="h-full bg-kivo-cyan transition-all"
                                    style={{ width: `${att.progress}%` }}
                                  />
                                </div>
                              </div>
                            ) : att.error ? (
                              <span className="text-[10px] text-rose-400">{att.error}</span>
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            )}

                            <button
                              type="button"
                              onClick={() => handleRemoveAttachment(att.file)}
                              className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                              title="Remove file"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add File Picker */}
                  <label className="flex items-center justify-center gap-2.5 p-3 rounded-2xl border border-dashed border-white/20 hover:border-kivo-cyan/50 hover:bg-white/[0.02] cursor-pointer transition-colors text-center">
                    <Upload className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-300">
                      Add attachments (Select one or multiple files)
                    </span>
                    <input
                      type="file"
                      multiple
                      onChange={handleFilesSelected}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || attachments.some((a) => a.isUploading)}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-kivo-blue via-kivo-cyan to-kivo-purple text-white text-xs font-bold shadow-lg shadow-kivo-blue/20 hover:opacity-95 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Submitting Ticket...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Submit Support Ticket</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
