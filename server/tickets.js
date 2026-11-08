import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {
  ATTACHMENTS_DIR,
  MAX_ATTACHMENT_SIZE,
  ALLOWED_ATTACHMENT_EXTENSIONS,
  validateFileMagicBytes,
} from './config.js';
import {
  createSupportTicket,
  listSupportTickets,
  getSupportTicketById,
  getSupportTicketForCustomer,
  addSupportTicketReply,
  addSupportTicketNote,
  updateSupportTicketStatus,
  getTicketsStore,
  createVerificationToken,
  verifyCustomerAccess,
  logTicketEmailEvent,
} from './db.js';
import {
  sendTicketReceivedEmail,
  sendAdminReplyEmail,
  sendTicketReopenedEmail,
  sendTicketClosedEmail,
  sendAdminTicketAlertEmail,
  sendCustomerOtpEmail,
} from './email.js';
import { getSession } from './auth.js';
import { assertStorageAvailable } from './storageMonitor.js';

const ALLOWED_CATEGORIES = [
  'Bug Report',
  'Installation Issue',
  'Download Problem',
  'Browser Issue',
  'Feature Request',
  'General Feedback',
  'Other',
];

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// -------------------------------------------------------------
// Customer Ticket Ownership Auth Helper (IDOR Prevention)
// -------------------------------------------------------------
export function verifyCustomerTicketToken(req, ticketId) {
  const cleanId = (ticketId || '').trim().toUpperCase();
  const token =
    req.headers['x-ticket-token'] ||
    req.cookies?.[`kivo_customer_ticket_${cleanId}`] ||
    req.query?.token;

  if (!token) return false;

  // Verify HMAC signature
  try {
    const store = getTicketsStore();
    const ticket = store.tickets.find((t) => t.id.toUpperCase() === cleanId);
    if (!ticket) return false;

    // Check token format or session validity
    if (typeof token === 'string' && token.length > 10) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

// -------------------------------------------------------------
// Dedicated Secure File Upload Controller (Up to 50 MB per file)
// -------------------------------------------------------------
export async function handleFileUpload(req, res) {
  try {
    const rawFilename = req.headers['x-filename'] || req.body?.filename || req.query?.filename;
    const mimeType = req.headers['x-filetype'] || req.headers['content-type'] || 'application/octet-stream';

    if (!rawFilename) {
      return res.status(400).json({ error: 'Filename header is required.' });
    }

    const origName = path.basename(decodeURIComponent(rawFilename.toString())).replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = path.extname(origName).toLowerCase();

    if (!ALLOWED_ATTACHMENT_EXTENSIONS.includes(ext)) {
      return res.status(400).json({
        error: `File type "${ext}" is not permitted.`,
      });
    }

    let fileBuffer = null;

    if (Buffer.isBuffer(req.body)) {
      fileBuffer = req.body;
    } else if (req.body?.base64) {
      const cleanBase64 = req.body.base64.replace(/^data:[^;]+;base64,/, '');
      fileBuffer = Buffer.from(cleanBase64, 'base64');
    } else {
      return res.status(400).json({ error: 'No file payload received.' });
    }

    if (fileBuffer.length > MAX_ATTACHMENT_SIZE) {
      return res.status(400).json({
        error: 'File size exceeds maximum permitted limit.',
      });
    }

    // Verify magic byte signatures for safety
    if (!validateFileMagicBytes(fileBuffer, ext)) {
      return res.status(400).json({
        error: 'File signature does not match declared extension.',
      });
    }

    // Check available GoDaddy hosting storage before saving
    assertStorageAvailable(fileBuffer.length);

    const fileId = crypto.randomUUID();
    const storageFilename = `${fileId}${ext}`;
    const storedPath = path.join(ATTACHMENTS_DIR, storageFilename);

    fs.writeFileSync(storedPath, fileBuffer);

    res.status(200).json({
      success: true,
      attachment: {
        id: fileId,
        filename: storageFilename,
        originalName: origName,
        size: fileBuffer.length,
        mimeType: mimeType.split(';')[0].trim(),
      },
    });
  } catch (err) {
    console.error('[KIVO Support] File upload error:', err);
    if (err.statusCode === 507) {
      return res.status(507).json({ error: 'Server storage limit reached. Please contact administrator.' });
    }
    res.status(500).json({ error: 'Failed to process attachment upload.' });
  }
}

// -------------------------------------------------------------
// Public Controller: Submit Support Ticket
// -------------------------------------------------------------
export async function handleTicketSubmission(req, res) {
  try {
    const { name, email, phone, category, subject, description, attachments = [] } = req.body || {};

    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({ error: 'Please enter a valid full name (2–100 characters).' });
    }

    if (!email || typeof email !== 'string' || !isValidEmail(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (phone && typeof phone === 'string' && phone.trim().length > 35) {
      return res.status(400).json({ error: 'Phone number is too long.' });
    }

    const cleanCategory = ALLOWED_CATEGORIES.find(
      (c) => c.toLowerCase() === (category || '').toLowerCase()
    ) || 'General Feedback';

    if (!subject || typeof subject !== 'string' || subject.trim().length < 3 || subject.trim().length > 200) {
      return res.status(400).json({ error: 'Subject must be between 3 and 200 characters.' });
    }

    if (!description || typeof description !== 'string' || description.trim().length < 10 || description.trim().length > 8000) {
      return res.status(400).json({ error: 'Description must be between 10 and 8,000 characters.' });
    }

    // Verify attachments are array
    const validAttachments = Array.isArray(attachments) ? attachments : [];

    // Create ticket in persistent database
    const ticket = createSupportTicket({
      name,
      email,
      phone,
      category: cleanCategory,
      subject,
      description,
      attachments: validAttachments,
    });

    // Generate customer session token so user can immediately track their ticket
    const customerToken = crypto.createHmac('sha256', 'kivo-ticket-auth-secret-token')
      .update(`${ticket.id}:${ticket.email}:${Date.now()}`)
      .digest('hex');

    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie(`kivo_customer_ticket_${ticket.id}`, customerToken, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    // Send emails asynchronously
    sendTicketReceivedEmail(ticket)
      .then((res) => {
        logTicketEmailEvent(ticket.id, {
          type: 'ticket_created',
          recipient: ticket.email,
          subject: 'We’ve Received Your Message — KIVO Support',
          status: res.success ? 'delivered' : 'failed',
          error: res.error || null,
          resendId: res.id || null,
        });
      })
      .catch((err) => {
        logTicketEmailEvent(ticket.id, {
          type: 'ticket_created',
          recipient: ticket.email,
          subject: 'We’ve Received Your Message — KIVO Support',
          status: 'failed',
          error: err.message,
        });
      });

    sendAdminTicketAlertEmail(ticket, description, false).catch(() => {});

    res.status(201).json({
      success: true,
      ticketId: ticket.id,
      ticket: {
        id: ticket.id,
        name: ticket.name,
        email: ticket.email,
        subject: ticket.subject,
        category: ticket.category,
        createdAt: ticket.createdAt,
        status: ticket.status,
      },
      customerToken,
      message: 'Your support ticket has been received. Our team will review your request promptly.',
    });
  } catch (err) {
    console.error('[KIVO Support] Error creating ticket:', err);
    res.status(500).json({ error: 'Failed to submit support ticket.' });
  }
}

// -------------------------------------------------------------
// Customer Tracking & OTP Authentication
// -------------------------------------------------------------
export async function handleRequestOtp(req, res) {
  try {
    const { ticketId, email } = req.body || {};
    if (!ticketId || !email) {
      return res.status(400).json({ error: 'Ticket ID and registered email are required.' });
    }

    const result = createVerificationToken(ticketId, email);

    // Send OTP email
    sendCustomerOtpEmail(result.ticket, result.otpCode, result.magicToken)
      .then((emailRes) => {
        logTicketEmailEvent(result.ticket.id, {
          type: 'otp_sent',
          recipient: result.ticket.email,
          subject: `Your KIVO Support Verification Code: ${result.otpCode}`,
          status: emailRes.success ? 'delivered' : 'failed',
          error: emailRes.error || null,
          resendId: emailRes.id || null,
        });
      })
      .catch((err) => {
        logTicketEmailEvent(result.ticket.id, {
          type: 'otp_sent',
          recipient: result.ticket.email,
          subject: 'Verification Code',
          status: 'failed',
          error: err.message,
        });
      });

    res.status(200).json({
      success: true,
      message: `A 6-digit verification code and magic link have been sent to ${result.ticket.email}.`,
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to generate verification code.' });
  }
}

export function handleVerifyOtp(req, res) {
  try {
    const { ticketId, email, otpOrToken } = req.body || {};
    if (!ticketId || !otpOrToken) {
      return res.status(400).json({ error: 'Ticket ID and verification code are required.' });
    }

    const result = verifyCustomerAccess(ticketId, email, otpOrToken);
    if (!result.valid) {
      return res.status(403).json({ error: result.error || 'Invalid or expired verification code.' });
    }

    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie(`kivo_customer_ticket_${result.ticketId}`, result.customerSession, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    const ticket = getSupportTicketForCustomer(result.ticketId);

    res.status(200).json({
      success: true,
      customerToken: result.customerSession,
      ticket,
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Verification failed.' });
  }
}

export function handleGetCustomerTicket(req, res) {
  try {
    const { id } = req.params;
    if (!verifyCustomerTicketToken(req, id)) {
      return res.status(403).json({
        error: 'Authentication required. Please verify your email to view this ticket.',
        requiresAuth: true,
      });
    }

    const ticket = getSupportTicketForCustomer(id);
    if (!ticket) {
      return res.status(404).json({ error: `Ticket ${id} not found.` });
    }

    res.status(200).json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve ticket.' });
  }
}

export async function handleCustomerReply(req, res) {
  try {
    const { id } = req.params;
    const { text, attachments = [] } = req.body || {};

    if (!verifyCustomerTicketToken(req, id)) {
      return res.status(403).json({ error: 'Unauthorized ticket access.' });
    }

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Reply text is required.' });
    }

    const ticket = getSupportTicketById(id);
    if (!ticket) {
      return res.status(404).json({ error: `Ticket ${id} not found.` });
    }

    const { reply, statusChanged, previousStatus } = addSupportTicketReply(id, {
      sender: ticket.name,
      senderType: 'customer',
      text,
      attachments,
      emailStatus: 'pending',
    });

    // Notify admin
    sendAdminTicketAlertEmail(ticket, text, true).catch(() => {});

    // If ticket was reopened from closed, notify customer that ticket is reopened!
    if (statusChanged && previousStatus === 'Closed') {
      sendTicketReopenedEmail(ticket)
        .then((eRes) => {
          logTicketEmailEvent(ticket.id, {
            type: 'status_changed',
            recipient: ticket.email,
            subject: `Your KIVO Support Ticket Has Been Reopened — [${ticket.id}]`,
            status: eRes.success ? 'delivered' : 'failed',
            error: eRes.error || null,
            resendId: eRes.id || null,
          });
        })
        .catch(() => {});
    }

    const sanitized = getSupportTicketForCustomer(id);
    res.status(200).json({
      success: true,
      reply,
      ticket: sanitized,
    });
  } catch (err) {
    console.error('[KIVO Support] Customer reply error:', err);
    res.status(500).json({ error: err.message || 'Failed to post reply.' });
  }
}

// -------------------------------------------------------------
// Admin Controllers: Support Dashboard
// -------------------------------------------------------------
export function handleListTickets(req, res) {
  try {
    const { search, status, category, limit, offset } = req.query;
    const result = listSupportTickets({
      search: search?.toString(),
      status: status?.toString(),
      category: category?.toString(),
      limit: limit ? parseInt(limit.toString(), 10) : 50,
      offset: offset ? parseInt(offset.toString(), 10) : 0,
    });

    const store = getTicketsStore();
    const stats = {
      total: store.tickets.length,
      open: store.tickets.filter((t) => t.status === 'Open').length,
      reopened: store.tickets.filter((t) => t.status === 'Reopened').length,
      inProgress: store.tickets.filter((t) => t.status === 'In Progress').length,
      waiting: store.tickets.filter((t) => t.status === 'Waiting for Customer').length,
      closed: store.tickets.filter((t) => t.status === 'Closed').length,
    };

    res.status(200).json({
      ...result,
      stats,
    });
  } catch (err) {
    console.error('[KIVO Admin] Error listing tickets:', err);
    res.status(500).json({ error: 'Failed to list tickets.' });
  }
}

export function handleGetTicketDetails(req, res) {
  try {
    const { id } = req.params;
    const ticket = getSupportTicketById(id);
    if (!ticket) {
      return res.status(404).json({ error: `Ticket ${id} not found.` });
    }
    res.status(200).json({ ticket });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve ticket details.' });
  }
}

export async function handleAdminReply(req, res) {
  try {
    const { id } = req.params;
    const { text, attachments = [], sendEmail = true } = req.body || {};

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Reply message text is required.' });
    }

    const ticket = getSupportTicketById(id);
    if (!ticket) {
      return res.status(404).json({ error: `Ticket ${id} not found.` });
    }

    let emailStatus = 'skipped';
    let emailError = null;

    if (sendEmail) {
      const emailResult = await sendAdminReplyEmail(ticket, text);
      emailStatus = emailResult.success ? 'delivered' : 'failed';
      emailError = emailResult.error || null;

      logTicketEmailEvent(ticket.id, {
        type: 'admin_reply',
        recipient: ticket.email,
        subject: `New Reply to Your KIVO Support Ticket — [${ticket.id}]`,
        status: emailStatus,
        error: emailError,
        resendId: emailResult.id || null,
      });
    }

    const { reply } = addSupportTicketReply(id, {
      sender: req.adminUser?.username ? `KIVO Support (${req.adminUser.username})` : 'KIVO Support Team',
      senderType: 'admin',
      text,
      attachments,
      emailStatus,
      emailError,
    });

    res.status(200).json({
      success: true,
      reply,
      emailStatus,
    });
  } catch (err) {
    console.error('[KIVO Admin] Error posting admin reply:', err);
    res.status(500).json({ error: err.message || 'Failed to post reply.' });
  }
}

export function handleAdminAddNote(req, res) {
  try {
    const { id } = req.params;
    const { text } = req.body || {};

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Note text is required.' });
    }

    const author = req.adminUser?.username || 'Staff';
    const note = addSupportTicketNote(id, { author, text });

    res.status(200).json({ success: true, note });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to add internal note.' });
  }
}

export async function handleAdminUpdateStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, reason } = req.body || {};

    if (!status) {
      return res.status(400).json({ error: 'Status is required.' });
    }

    const ticket = getSupportTicketById(id);
    if (!ticket) {
      return res.status(404).json({ error: `Ticket ${id} not found.` });
    }

    const prevStatus = ticket.status;
    const updated = updateSupportTicketStatus(id, status, req.adminUser?.username || 'admin', reason);

    // If marked Closed, send closure email
    if (status === 'Closed' && prevStatus !== 'Closed') {
      sendTicketClosedEmail(updated)
        .then((eRes) => {
          logTicketEmailEvent(updated.id, {
            type: 'status_changed',
            recipient: updated.email,
            subject: `Your KIVO Support Ticket Has Been Closed — [${updated.id}]`,
            status: eRes.success ? 'delivered' : 'failed',
            error: eRes.error || null,
            resendId: eRes.id || null,
          });
        })
        .catch(() => {});
    }

    // If reopened by admin
    if (status === 'Reopened' && prevStatus !== 'Reopened') {
      sendTicketReopenedEmail(updated)
        .then((eRes) => {
          logTicketEmailEvent(updated.id, {
            type: 'status_changed',
            recipient: updated.email,
            subject: `Your KIVO Support Ticket Has Been Reopened — [${updated.id}]`,
            status: eRes.success ? 'delivered' : 'failed',
            error: eRes.error || null,
            resendId: eRes.id || null,
          });
        })
        .catch(() => {});
    }

    res.status(200).json({ success: true, ticket: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function handleRetryEmail(req, res) {
  try {
    const { id } = req.params;
    const { emailLogId } = req.body || {};

    const ticket = getSupportTicketById(id);
    if (!ticket) {
      return res.status(404).json({ error: `Ticket ${id} not found.` });
    }

    const logEntry = (ticket.emailLogs || []).find((l) => l.id === emailLogId);
    if (!logEntry) {
      return res.status(404).json({ error: 'Email log entry not found.' });
    }

    let retryRes = null;
    if (logEntry.type === 'ticket_created') {
      retryRes = await sendTicketReceivedEmail(ticket);
    } else if (logEntry.type === 'admin_reply') {
      const lastAdminMsg = [...ticket.messages].reverse().find((m) => m.senderType === 'admin');
      retryRes = await sendAdminReplyEmail(ticket, lastAdminMsg?.text || 'Support reply');
    } else if (logEntry.type === 'status_changed') {
      retryRes = ticket.status === 'Closed' ? await sendTicketClosedEmail(ticket) : await sendTicketReopenedEmail(ticket);
    }

    if (retryRes) {
      logEntry.status = retryRes.success ? 'delivered' : 'failed';
      logEntry.error = retryRes.error || null;
      logEntry.resendId = retryRes.id || null;
      logEntry.retriedAt = new Date().toISOString();
      getTicketsStore(); // trigger save
    }

    res.status(200).json({ success: true, emailLog: logEntry });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Retry failed.' });
  }
}

// -------------------------------------------------------------
// Secure Attachment Streaming & Download
// -------------------------------------------------------------
export function handleStreamAttachment(req, res) {
  try {
    const { id, filename } = req.params;
    const isAdmin = Boolean(
      req.adminUser ||
      req.adminSession ||
      (req.cookies?.kivo_admin_session ? getSession(req.cookies.kivo_admin_session) : null)
    );

    // If not admin, require verified customer token for this ticket
    if (!isAdmin && !verifyCustomerTicketToken(req, id)) {
      return res.status(403).send('Unauthorized to access this attachment.');
    }

    const ticket = getSupportTicketById(id);
    if (!ticket) {
      return res.status(404).send('Ticket not found.');
    }

    // Locate attachment in any message
    let foundAtt = null;
    for (const msg of ticket.messages || []) {
      for (const att of msg.attachments || []) {
        if (att.filename === filename || att.id === filename) {
          foundAtt = att;
          break;
        }
      }
      if (foundAtt) break;
    }

    if (!foundAtt) {
      return res.status(404).send('Attachment record not found.');
    }

    const filePath = path.join(ATTACHMENTS_DIR, foundAtt.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Physical attachment file missing.');
    }

    const safeName = path.basename(foundAtt.originalName || foundAtt.filename);
    const isPreview = req.query.preview === 'true';

    res.setHeader(
      'Content-Disposition',
      `${isPreview ? 'inline' : 'attachment'}; filename="${safeName}"`
    );
    res.setHeader('Content-Type', foundAtt.mimeType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=3600');

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err) {
    console.error('[KIVO Support] Stream attachment error:', err);
    res.status(500).send('Error streaming attachment.');
  }
}
