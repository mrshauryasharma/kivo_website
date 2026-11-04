import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { ATTACHMENTS_DIR } from './config.js';
import {
  createSupportTicket,
  listSupportTickets,
  getSupportTicketById,
  addSupportTicketReply,
  addSupportTicketNote,
  updateSupportTicketStatus,
  getTicketsStore,
} from './db.js';
import {
  sendCustomerConfirmation,
  sendAdminNotification,
  sendAdminReplyToCustomer,
} from './email.js';

const ALLOWED_ATTACHMENT_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.pdf', '.txt', '.log'];
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_CATEGORIES = [
  'Bug report',
  'Installation problem',
  'Download problem',
  'Browser issue',
  'Feature request',
  'General feedback',
  'Other',
];

// Helper: Basic Email Regex
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// -------------------------------------------------------------
// Public Controller: Submit Support Ticket
// -------------------------------------------------------------
export async function handleTicketSubmission(req, res) {
  try {
    const { name, email, phone, category, subject, description, attachment } = req.body || {};

    // 1. Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({ error: 'Please enter a valid full name (2–100 characters).' });
    }

    if (!email || typeof email !== 'string' || !isValidEmail(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (phone && typeof phone === 'string' && phone.trim().length > 30) {
      return res.status(400).json({ error: 'Phone number is too long (maximum 30 characters).' });
    }

    const cleanCategory = ALLOWED_CATEGORIES.includes(category) ? category : 'General feedback';

    if (!subject || typeof subject !== 'string' || subject.trim().length < 3 || subject.trim().length > 200) {
      return res.status(400).json({ error: 'Subject must be between 3 and 200 characters.' });
    }

    if (!description || typeof description !== 'string' || description.trim().length < 10 || description.trim().length > 5000) {
      return res.status(400).json({ error: 'Description must be between 10 and 5,000 characters.' });
    }

    // 2. Handle optional attachment (base64)
    let processedAttachment = null;
    if (attachment && typeof attachment === 'object' && attachment.base64 && attachment.name) {
      const origName = path.basename(attachment.name).replace(/[^a-zA-Z0-9._-]/g, '_');
      const ext = path.extname(origName).toLowerCase();

      if (!ALLOWED_ATTACHMENT_EXTENSIONS.includes(ext)) {
        return res.status(400).json({
          error: `Invalid file type "${ext}". Allowed types: ${ALLOWED_ATTACHMENT_EXTENSIONS.join(', ')}`,
        });
      }

      // Check base64 string
      const cleanBase64 = attachment.base64.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');

      if (buffer.length > MAX_ATTACHMENT_SIZE) {
        return res.status(400).json({
          error: `Attachment size (${(buffer.length / (1024 * 1024)).toFixed(1)} MB) exceeds 10 MB limit.`,
        });
      }

      const safeId = crypto.randomUUID();
      const storageFilename = `${safeId}${ext}`;
      const storedPath = path.join(ATTACHMENTS_DIR, storageFilename);

      fs.writeFileSync(storedPath, buffer);

      processedAttachment = {
        filename: storageFilename,
        originalName: origName,
        size: buffer.length,
        mimeType: attachment.type || 'application/octet-stream',
        storedPath,
      };
    }

    // 3. Create ticket in persistent database
    const ticket = createSupportTicket({
      name,
      email,
      phone,
      category: cleanCategory,
      subject,
      description,
      attachment: processedAttachment,
    });

    // 4. Trigger Resend emails asynchronously in background
    Promise.allSettled([
      sendCustomerConfirmation(ticket),
      sendAdminNotification(ticket),
    ]).catch((err) => {
      console.warn('[KIVO Support] Background email dispatch error:', err.message);
    });

    res.status(201).json({
      success: true,
      ticketId: ticket.id,
      message: 'Your support ticket has been received. Our team will contact you shortly.',
    });
  } catch (err) {
    console.error('[KIVO Support] Error creating ticket:', err);
    res.status(500).json({ error: 'Failed to submit support ticket. Please try again.' });
  }
}

// -------------------------------------------------------------
// Admin Controllers: Ticket Management
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

    // Compute stats
    const store = getTicketsStore();
    const stats = {
      total: store.tickets.length,
      new: store.tickets.filter((t) => t.status === 'New').length,
      open: store.tickets.filter((t) => t.status === 'Open').length,
      inProgress: store.tickets.filter((t) => t.status === 'In Progress').length,
      waiting: store.tickets.filter((t) => t.status === 'Waiting for Customer').length,
      resolved: store.tickets.filter((t) => t.status === 'Resolved').length,
      closed: store.tickets.filter((t) => t.status === 'Closed').length,
    };

    res.status(200).json({
      ...result,
      stats,
    });
  } catch (err) {
    console.error('[KIVO Admin] Error listing tickets:', err);
    res.status(500).json({ error: 'Failed to list support tickets.' });
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

export async function handleAddReply(req, res) {
  try {
    const { id } = req.params;
    const { text, sendEmail = true } = req.body || {};

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Reply text is required.' });
    }

    const ticket = getSupportTicketById(id);
    if (!ticket) {
      return res.status(404).json({ error: `Ticket ${id} not found.` });
    }

    let emailStatus = 'skipped';
    if (sendEmail) {
      const emailResult = await sendAdminReplyToCustomer(ticket, text, ticket.messages);
      emailStatus = emailResult.success ? 'sent' : (emailResult.error || 'failed');
    }

    const { reply } = addSupportTicketReply(id, {
      sender: req.adminUser?.username ? `Staff (${req.adminUser.username})` : 'KIVO Support Team',
      senderType: 'admin',
      text,
      emailStatus,
    });

    res.status(200).json({
      success: true,
      reply,
      emailStatus,
    });
  } catch (err) {
    console.error('[KIVO Admin] Error posting reply:', err);
    res.status(500).json({ error: err.message || 'Failed to post reply.' });
  }
}

export function handleAddInternalNote(req, res) {
  try {
    const { id } = req.params;
    const { text } = req.body || {};

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Note text is required.' });
    }

    const author = req.adminUser?.username || 'Admin';
    const note = addSupportTicketNote(id, { author, text });

    res.status(200).json({
      success: true,
      note,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to add internal note.' });
  }
}

export function handleUpdateTicketStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!status) {
      return res.status(400).json({ error: 'Status is required.' });
    }

    const updated = updateSupportTicketStatus(id, status);
    res.status(200).json({ success: true, ticket: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export function handleDownloadAttachment(req, res) {
  try {
    const { id } = req.params;
    const ticket = getSupportTicketById(id);

    if (!ticket || !ticket.attachment || !ticket.attachment.filename) {
      return res.status(404).send('Attachment not found for this ticket.');
    }

    const filePath = path.join(ATTACHMENTS_DIR, ticket.attachment.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Attachment file is missing on storage.');
    }

    const safeName = path.basename(ticket.attachment.originalName || 'attachment');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.setHeader('Content-Type', ticket.attachment.mimeType || 'application/octet-stream');

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err) {
    console.error('[KIVO Admin] Attachment download error:', err);
    res.status(500).send('Failed to download attachment.');
  }
}
