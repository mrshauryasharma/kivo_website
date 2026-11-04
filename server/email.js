import { getEmailConfig } from './config.js';

// Helper: Make HTTP request to Resend REST API
async function postResendEmail({ to, subject, html, replyTo }) {
  const config = getEmailConfig();

  if (!config.isConfigured) {
    console.log(`[KIVO Email] Resend API key not configured. Skipped sending email to <${to}>: "${subject}".`);
    return {
      success: false,
      skipped: true,
      reason: 'RESEND_API_KEY not configured in environment variables.',
    };
  }

  try {
    const payload = {
      from: config.fromEmail,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    };
    if (replyTo) {
      payload.reply_to = replyTo;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.warn(`[KIVO Email] Resend API error (${response.status}):`, data);
      return {
        success: false,
        status: response.status,
        error: data.message || 'Failed to dispatch email via Resend',
      };
    }

    console.log(`[KIVO Email] Email successfully delivered to <${to}> (Resend ID: ${data.id})`);
    return {
      success: true,
      id: data.id,
    };
  } catch (err) {
    console.error(`[KIVO Email] Network error sending email to <${to}>:`, err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}

// -------------------------------------------------------------
// 1. Send Automatic Confirmation to Customer
// -------------------------------------------------------------
export async function sendCustomerConfirmation(ticket) {
  const subject = `[${ticket.id}] Support Request Received: ${ticket.subject}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; margin: 0; padding: 24px; }
    .card { max-width: 600px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #0ea5e9, #38bdf8, #818cf8); padding: 28px 24px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .content { padding: 28px 24px; font-size: 14px; line-height: 1.6; color: #cbd5e1; }
    .ticket-badge { display: inline-block; background-color: rgba(14, 165, 233, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; font-weight: 700; padding: 6px 14px; border-radius: 20px; font-size: 13px; margin-bottom: 16px; }
    .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; background: rgba(0,0,0,0.2); border-radius: 8px; }
    .details-table td { padding: 10px 14px; border-bottom: 1px solid #1f2937; font-size: 13px; }
    .details-table td.label { width: 30%; color: #94a3b8; font-weight: 600; }
    .details-table td.value { color: #f8fafc; }
    .footer { padding: 20px 24px; background-color: #0d121f; border-top: 1px solid #1f2937; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>KIVO Browser Support</h1>
    </div>
    <div class="content">
      <div class="ticket-badge">${ticket.id}</div>
      <p>Hello <strong>${ticket.name}</strong>,</p>
      <p>Thank you for reaching out to the KIVO Browser support team. We have received your inquiry and our engineering team is reviewing it.</p>
      
      <table class="details-table">
        <tr><td class="label">Ticket ID</td><td class="value"><strong>${ticket.id}</strong></td></tr>
        <tr><td class="label">Category</td><td class="value">${ticket.category}</td></tr>
        <tr><td class="label">Subject</td><td class="value">${ticket.subject}</td></tr>
        <tr><td class="label">Status</td><td class="value">${ticket.status}</td></tr>
      </table>

      <p><strong>Your Message:</strong></p>
      <blockquote style="background: rgba(255,255,255,0.03); border-left: 3px solid #0ea5e9; padding: 10px 14px; margin: 0 0 16px 0; color: #e2e8f0;">
        ${ticket.description.replace(/\n/g, '<br/>')}
      </blockquote>

      <p>We typically respond within 24 business hours. If you have additional details or screenshots, please feel free to reply directly to this email.</p>
      <p>Warm regards,<br/><strong>The KIVO Engineering & Support Team</strong></p>
    </div>
    <div class="footer">
      © 2026 KIVO Browser • Fast, Private, AI-Powered • <a href="https://kivobrowser.com" style="color: #38bdf8; text-decoration: none;">kivobrowser.com</a>
    </div>
  </div>
</body>
</html>
  `.trim();

  return postResendEmail({
    to: ticket.email,
    subject,
    html,
  });
}

// -------------------------------------------------------------
// 2. Send Notification to Admin / Support Mailbox
// -------------------------------------------------------------
export async function sendAdminNotification(ticket) {
  const config = getEmailConfig();
  const subject = `🚨 [${ticket.id}] New Support Ticket: ${ticket.category} - ${ticket.subject}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; padding: 20px; }
    .card { max-width: 600px; margin: 0 auto; background-color: #111827; border: 1px solid #374151; border-radius: 10px; padding: 24px; }
    h2 { color: #38bdf8; margin-top: 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    td { padding: 8px 10px; border-bottom: 1px solid #1f2937; font-size: 13px; }
    td.label { color: #9ca3af; font-weight: 600; width: 30%; }
    .desc { background: #1f2937; padding: 14px; border-radius: 6px; font-size: 13px; line-height: 1.5; color: #f3f4f6; }
  </style>
</head>
<body>
  <div class="card">
    <h2>New Customer Support Ticket</h2>
    <table>
      <tr><td class="label">Ticket ID</td><td><strong>${ticket.id}</strong></td></tr>
      <tr><td class="label">Customer Name</td><td>${ticket.name}</td></tr>
      <tr><td class="label">Customer Email</td><td><a href="mailto:${ticket.email}" style="color: #38bdf8;">${ticket.email}</a></td></tr>
      <tr><td class="label">Phone</td><td>${ticket.phone || 'Not provided'}</td></tr>
      <tr><td class="label">Category</td><td>${ticket.category}</td></tr>
      <tr><td class="label">Subject</td><td>${ticket.subject}</td></tr>
      <tr><td class="label">Attachment</td><td>${ticket.attachment ? `${ticket.attachment.originalName} (${(ticket.attachment.size / 1024).toFixed(1)} KB)` : 'None'}</td></tr>
    </table>
    <p><strong>Description:</strong></p>
    <div class="desc">${ticket.description.replace(/\n/g, '<br/>')}</div>
    <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
      Log in to <a href="/kivoadmin" style="color: #38bdf8;">KIVO Admin Portal</a> to respond to this ticket.
    </p>
  </div>
</body>
</html>
  `.trim();

  return postResendEmail({
    to: config.supportEmail,
    subject,
    html,
    replyTo: ticket.email,
  });
}

// -------------------------------------------------------------
// 3. Send Admin Reply to Customer
// -------------------------------------------------------------
export async function sendAdminReplyToCustomer(ticket, replyText, threadHistory = []) {
  const subject = `Re: [${ticket.id}] ${ticket.subject}`;

  const historyHtml = threadHistory
    .slice(-3)
    .reverse()
    .map(
      (m) =>
        `<div style="margin-bottom: 12px; font-size: 12px; border-left: 2px solid #374151; padding-left: 10px; color: #9ca3af;">
          <strong>${m.sender}</strong> (${new Date(m.timestamp).toLocaleString()}):<br/>
          <span style="color: #cbd5e1;">${m.text.replace(/\n/g, '<br/>')}</span>
        </div>`
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; margin: 0; padding: 24px; }
    .card { max-width: 600px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #0ea5e9, #38bdf8); padding: 24px; text-align: center; }
    .header h2 { margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; }
    .content { padding: 24px; font-size: 14px; line-height: 1.6; color: #cbd5e1; }
    .reply-box { background: rgba(14, 165, 233, 0.08); border-left: 4px solid #0ea5e9; padding: 14px 16px; margin: 16px 0; border-radius: 0 8px 8px 0; color: #f8fafc; font-size: 14px; }
    .footer { padding: 16px 24px; background-color: #0d121f; border-top: 1px solid #1f2937; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h2>KIVO Support Reply: ${ticket.id}</h2>
    </div>
    <div class="content">
      <p>Hello <strong>${ticket.name}</strong>,</p>
      <p>A message has been posted regarding your support ticket:</p>

      <div class="reply-box">
        ${replyText.replace(/\n/g, '<br/>')}
      </div>

      <p style="margin-top: 20px; font-size: 13px; color: #94a3b8;">
        You can reply directly to this email to continue the conversation.
      </p>

      ${
        historyHtml
          ? `<div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #1f2937;">
               <p style="font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 8px;">Previous Messages:</p>
               ${historyHtml}
             </div>`
          : ''
      }
    </div>
    <div class="footer">
      © 2026 KIVO Browser Support • Reference: ${ticket.id}
    </div>
  </div>
</body>
</html>
  `.trim();

  return postResendEmail({
    to: ticket.email,
    subject,
    html,
  });
}
