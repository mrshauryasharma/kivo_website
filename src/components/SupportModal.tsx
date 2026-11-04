import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  LifeBuoy,
  Send,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  FileText,
  Trash2,
} from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: string;
}

const CATEGORIES = [
  'Bug report',
  'Installation problem',
  'Download problem',
  'Browser issue',
  'Feature request',
  'General feedback',
  'Other',
];

const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.pdf', '.txt', '.log'];
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10 MB

export const SupportModal: React.FC<SupportModalProps> = ({
  isOpen,
  onClose,
  defaultCategory = 'Browser issue',
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState(defaultCategory);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  
  const [attachment, setAttachment] = useState<{
    name: string;
    type: string;
    size: number;
    base64: string;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError(`Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return;
    }

    if (file.size > MAX_ATTACHMENT_SIZE) {
      setError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Limit is 10 MB.`);
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        name: file.name,
        type: file.type,
        size: file.size,
        base64: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !subject.trim() || !description.trim()) {
      setError('Please fill out all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
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
          attachment,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit ticket.');
      }

      setCreatedTicketId(data.ticketId);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setName('');
    setEmail('');
    setPhone('');
    setCategory('Browser issue');
    setSubject('');
    setDescription('');
    setAttachment(null);
    setError(null);
    setCreatedTicketId(null);
    onClose();
  };

  const handleCopyTicketId = () => {
    if (!createdTicketId) return;
    navigator.clipboard.writeText(createdTicketId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleReset}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 16 }}
          className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 to-[#0b0f19] border border-white/10 rounded-2xl shadow-2xl shadow-kivo-blue/10 overflow-hidden my-8 z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-kivo-blue/20 to-kivo-cyan/20 border border-kivo-cyan/30 flex items-center justify-center text-kivo-cyan">
                <LifeBuoy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-wide">
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

          <div className="p-6">
            {createdTicketId ? (
              /* Success State */
              <div className="py-8 text-center space-y-5">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-xl font-bold text-white">Ticket Submitted Successfully!</h4>
                  <p className="text-sm text-slate-300 max-w-md mx-auto">
                    We have logged your ticket and sent a confirmation email to{' '}
                    <span className="text-kivo-cyan font-semibold">{email}</span>.
                  </p>
                </div>

                <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-black/40 border border-white/10">
                  <span className="text-xs text-slate-400">Your Ticket Reference:</span>
                  <span className="text-sm font-mono font-bold text-kivo-cyan">
                    {createdTicketId}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyTicketId}
                    className="p-1 text-slate-400 hover:text-white transition-colors"
                    title="Copy Ticket ID"
                  >
                    {copiedId ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <p className="text-xs text-slate-500">
                  Please save your ticket reference for tracking. Our team typically replies within 24 hours.
                </p>

                <div className="pt-4">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-kivo-blue to-kivo-cyan text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            ) : (
              /* Ticket Form */
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{error}</span>
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
                      Mobile Number
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
                    Problem Description / Feedback <span className="text-rose-400">*</span>
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

                {/* Optional Attachment */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Attachment <span className="text-slate-500 font-normal">(Optional, max 10MB)</span>
                  </label>
                  {attachment ? (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                      <div className="flex items-center gap-2 text-xs text-slate-200 truncate">
                        <FileText className="w-4 h-4 text-kivo-cyan shrink-0" />
                        <span className="truncate">{attachment.name}</span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          ({(attachment.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachment(null)}
                        className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-white/20 hover:border-kivo-cyan/50 hover:bg-white/[0.02] cursor-pointer transition-colors">
                      <Paperclip className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-400">
                        Attach screenshot or log file (.png, .jpg, .pdf, .txt, .log)
                      </span>
                      <input
                        type="file"
                        onChange={handleFileChange}
                        accept=".png,.jpg,.jpeg,.pdf,.txt,.log"
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Submit button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
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
                        <span>Send Support Request</span>
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
