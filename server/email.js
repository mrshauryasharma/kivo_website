import { getEmailConfig } from './config.js';

// Base responsive email styling wrapper
function renderEmailWrapper({ title, content, preheader = '' }) {
  const config = getEmailConfig();
  const year = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body { margin: 0; padding: 0; background-color: #050811; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    .container { max-width: 620px; margin: 0 auto; background-color: #0B0F19; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #090D1A 0%, #101B33 100%); padding: 32px 28px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
    .brand-title { color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
    .brand-sub { color: #38bdf8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 4px; }
    .content { padding: 36px 30px; font-size: 14px; line-height: 1.65; color: #cbd5e1; }
    .badge { display: inline-block; background: rgba(14, 165, 233, 0.12); border: 1px solid rgba(56, 189, 248, 0.35); color: #38bdf8; font-family: ui-monospace, Menlo, Monaco, Consolas, monospace; font-weight: 700; padding: 6px 14px; border-radius: 20px; font-size: 13px; margin-bottom: 16px; }
    .button { display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #38bdf8 50%, #818cf8 100%); color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 13px; padding: 14px 28px; border-radius: 10px; margin: 24px 0 16px 0; text-align: center; }
    .footer { padding: 24px 30px; background-color: #070B14; border-top: 1px solid rgba(255, 255, 255, 0.06); text-align: center; font-size: 12px; color: #64748b; line-height: 1.5; }
    .meta-box { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 14px 18px; margin: 20px 0; }
    .meta-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }
  </style>
</head>
<body>
  ${preheader ? `<div style="display:none;font-size:1px;color:#333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>` : ''}
  <div style="padding: 24px 12px;">
    <div class="container">
      <div class="header">
        <div class="brand-title">KIVO<span style="color:#38bdf8;">.</span></div>
        <div class="brand-sub">Customer Care & Engineering Support</div>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p style="margin: 0 0 6px 0;"><strong>KIVO Browser</strong> • The AI-Powered Desktop Browser Built for Speed & Privacy</p>
        <p style="margin: 0;"><a href="${config.appBaseUrl}" style="color: #38bdf8; text-decoration: none;">${config.appBaseUrl}</a> • Confidential Support Channel</p>
        <p style="margin: 8px 0 0 0; font-size: 11px; color: #475569;">© ${year} KIVO Browser. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// Low-level Resend HTTP request
async function postResendEmail({ to, subject, html, text, replyTo }) {
  const config = getEmailConfig();

  if (!config.isConfigured) {
    console.log(`[KIVO Email] Resend unconfigured. Queued locally for <${to}>: "${subject}"`);
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
      text: text || subject,
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
        error: data.message || 'Resend API rejected message',
      };
    }

    console.log(`[KIVO Email] Delivered to <${to}> (Resend ID: ${data.id})`);
    return {
      success: true,
      id: data.id,
    };
  } catch (err) {
    console.error(`[KIVO Email] Network failure sending email:`, err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}

// -------------------------------------------------------------
// A. Ticket Received Confirmation
// -------------------------------------------------------------
export async function sendTicketReceivedEmail(ticket) {
  const config = getEmailConfig();
  const trackingUrl = `${config.appBaseUrl}/support/track?ticketId=${encodeURIComponent(ticket.id)}`;
  const subject = `We’ve Received Your Message — KIVO Support`;

  const html = renderEmailWrapper({
    title: subject,
    preheader: `Ticket ${ticket.id} received. Our team will review your request.`,
    content: `
      <div class="badge">${ticket.id}</div>
      <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">We've received your support request</h2>
      <p>Hello <strong>${ticket.name}</strong>,</p>
      <p>Thank you for reaching out to KIVO Support. Your inquiry has been logged in our engineering queue with the unique reference below:</p>

      <div class="meta-box">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="color:#94a3b8; width: 35%; padding: 4px 0;">Ticket Reference</td><td style="color:#38bdf8; font-family:monospace; font-weight:700;">${ticket.id}</td></tr>
          <tr><td style="color:#94a3b8; padding: 4px 0;">Category</td><td style="color:#ffffff;">${ticket.category}</td></tr>
          <tr><td style="color:#94a3b8; padding: 4px 0;">Subject</td><td style="color:#ffffff;">${ticket.subject}</td></tr>
          <tr><td style="color:#94a3b8; padding: 4px 0;">Submitted On</td><td style="color:#ffffff;">${new Date(ticket.createdAt).toLocaleString()}</td></tr>
          <tr><td style="color:#94a3b8; padding: 4px 0;">Current Status</td><td style="color:#38bdf8; font-weight:600;">${ticket.status}</td></tr>
        </table>
      </div>

      <p><strong>Your Message:</strong></p>
      <div style="background: rgba(0,0,0,0.3); border-left: 3px solid #0ea5e9; padding: 12px 16px; margin: 12px 0 20px 0; color: #e2e8f0; font-size: 13px;">
        ${ticket.description.replace(/\n/g, '<br/>')}
      </div>

      <p>Our engineering team will review your details and respond shortly. You can track status updates, view conversation history, and post additional attachments at any time using our secure tracking portal:</p>

      <div style="text-align: center;">
        <a href="${trackingUrl}" class="button">View Your Ticket & Conversation</a>
      </div>

      <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">
        To protect your account privacy, ticket details can only be viewed after confirming ownership with your email address.
      </p>
    `,
  });

  const text = `
Hello ${ticket.name},

We have received your support request for KIVO Browser.

Ticket ID: ${ticket.id}
Category: ${ticket.category}
Subject: ${ticket.subject}
Submitted: ${new Date(ticket.createdAt).toLocaleString()}

You can track your ticket and view updates anytime at:
${trackingUrl}

Warm regards,
The KIVO Engineering & Support Team
  `.trim();

  return postResendEmail({
    to: ticket.email,
    subject,
    html,
    text,
  });
}

// -------------------------------------------------------------
// B. Admin Reply Notification
// -------------------------------------------------------------
export async function sendAdminReplyEmail(ticket, replyText) {
  const config = getEmailConfig();
  const trackingUrl = `${config.appBaseUrl}/support/track?ticketId=${encodeURIComponent(ticket.id)}`;
  const subject = `New Reply to Your KIVO Support Ticket — [${ticket.id}]`;

  const html = renderEmailWrapper({
    title: subject,
    preheader: `New response from KIVO Support for ticket ${ticket.id}.`,
    content: `
      <div class="badge">${ticket.id}</div>
      <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">New response from KIVO Support</h2>
      <p>Hello <strong>${ticket.name}</strong>,</p>
      <p>A specialist from our support team has posted a new reply regarding your ticket <strong>"${ticket.subject}"</strong>:</p>

      <div style="background: rgba(14, 165, 233, 0.08); border-left: 4px solid #0ea5e9; padding: 16px 20px; margin: 20px 0; border-radius: 0 10px 10px 0; color: #f8fafc; font-size: 14px; line-height: 1.6;">
        ${replyText.replace(/\n/g, '<br/>')}
      </div>

      <p>To view the complete thread, download shared files, or send a reply back to our team, click below:</p>

      <div style="text-align: center;">
        <a href="${trackingUrl}" class="button">View Conversation & Reply</a>
      </div>
    `,
  });

  const text = `
Hello ${ticket.name},

A new response has been posted for ticket [${ticket.id}]: "${ticket.subject}"

Message:
${replyText}

View the full conversation and reply online at:
${trackingUrl}

The KIVO Support Team
  `.trim();

  return postResendEmail({
    to: ticket.email,
    subject,
    html,
    text,
  });
}

// -------------------------------------------------------------
// C. Ticket Reopened Notification
// -------------------------------------------------------------
export async function sendTicketReopenedEmail(ticket) {
  const config = getEmailConfig();
  const trackingUrl = `${config.appBaseUrl}/support/track?ticketId=${encodeURIComponent(ticket.id)}`;
  const subject = `Your KIVO Support Ticket Has Been Reopened — [${ticket.id}]`;

  const html = renderEmailWrapper({
    title: subject,
    preheader: `Ticket ${ticket.id} has been reopened.`,
    content: `
      <div class="badge">${ticket.id}</div>
      <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">Support Ticket Reopened</h2>
      <p>Hello <strong>${ticket.name}</strong>,</p>
      <p>We've received your follow-up message. Ticket <strong>[${ticket.id}]</strong> has been marked as <strong>Reopened</strong> and returned to our active support queue.</p>

      <div style="text-align: center;">
        <a href="${trackingUrl}" class="button">View Active Conversation</a>
      </div>

      <p style="font-size: 13px; color: #94a3b8;">
        Our team will follow up with you as soon as an engineer has reviewed the new information.
      </p>
    `,
  });

  const text = `
Hello ${ticket.name},

Ticket [${ticket.id}] has been reopened following your latest message.
Track conversation at: ${trackingUrl}

KIVO Support
  `.trim();

  return postResendEmail({
    to: ticket.email,
    subject,
    html,
    text,
  });
}

// -------------------------------------------------------------
// D. Ticket Closed Notification
// -------------------------------------------------------------
export async function sendTicketClosedEmail(ticket) {
  const config = getEmailConfig();
  const trackingUrl = `${config.appBaseUrl}/support/track?ticketId=${encodeURIComponent(ticket.id)}`;
  const subject = `Your KIVO Support Ticket Has Been Closed — [${ticket.id}]`;

  const html = renderEmailWrapper({
    title: subject,
    preheader: `Ticket ${ticket.id} has been resolved and closed.`,
    content: `
      <div class="badge" style="border-color: rgba(16, 185, 129, 0.4); color: #34d399; background: rgba(16, 185, 129, 0.1);">${ticket.id} • Closed</div>
      <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">Your ticket has been marked as Closed</h2>
      <p>Hello <strong>${ticket.name}</strong>,</p>
      <p>This is a quick notification to let you know that ticket <strong>[${ticket.id}]</strong> ("${ticket.subject}") has been marked as Closed.</p>

      <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; font-size: 13px; color: #cbd5e1;">
          <strong>Need further assistance?</strong> You can return to this exact ticket anytime using your Ticket ID and send another message. Sending a new message will automatically reopen the ticket.
        </p>
      </div>

      <div style="text-align: center;">
        <a href="${trackingUrl}" class="button">View Ticket History</a>
      </div>
    `,
  });

  const text = `
Hello ${ticket.name},

Ticket [${ticket.id}] has been closed.
If you need further help, simply visit the ticket link below and send a reply to automatically reopen it:
${trackingUrl}

Thank you for choosing KIVO Browser.
  `.trim();

  return postResendEmail({
    to: ticket.email,
    subject,
    html,
    text,
  });
}

// -------------------------------------------------------------
// E. Notification to Admin (New Ticket or Customer Message)
// -------------------------------------------------------------
export async function sendAdminTicketAlertEmail(ticket, messageText, isReply = false) {
  const config = getEmailConfig();
  const adminUrl = `${config.appBaseUrl}/kivoadmin`;
  const subject = isReply
    ? `💬 [${ticket.id}] Customer Reply from ${ticket.name}: ${ticket.subject}`
    : `🚨 [${ticket.id}] New Support Ticket: ${ticket.category} - ${ticket.subject}`;

  const html = renderEmailWrapper({
    title: subject,
    content: `
      <div class="badge">${ticket.id}</div>
      <h2 style="color: #ffffff; margin-top: 0;">${isReply ? 'New Customer Reply' : 'New Customer Support Request'}</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        <tr><td style="color:#94a3b8; width: 30%; padding: 4px 0;">Ticket ID</td><td><strong>${ticket.id}</strong></td></tr>
        <tr><td style="color:#94a3b8; padding: 4px 0;">Customer</td><td>${ticket.name}</td></tr>
        <tr><td style="color:#94a3b8; padding: 4px 0;">Email</td><td><a href="mailto:${ticket.email}" style="color:#38bdf8;">${ticket.email}</a></td></tr>
        <tr><td style="color:#94a3b8; padding: 4px 0;">Phone</td><td>${ticket.phone || 'Not provided'}</td></tr>
        <tr><td style="color:#94a3b8; padding: 4px 0;">Category</td><td>${ticket.category}</td></tr>
        <tr><td style="color:#94a3b8; padding: 4px 0;">Subject</td><td>${ticket.subject}</td></tr>
      </table>

      <p><strong>Message Content:</strong></p>
      <div style="background: rgba(255,255,255,0.04); border-left: 3px solid #0ea5e9; padding: 14px; border-radius: 6px; font-size: 13px; color: #f3f4f6;">
        ${(messageText || ticket.description).replace(/\n/g, '<br/>')}
      </div>

      <div style="text-align: center; margin-top: 20px;">
        <a href="${adminUrl}" class="button">Open in KIVO Admin Portal</a>
      </div>
    `,
  });

  const text = `
${isReply ? 'New Customer Reply' : 'New Support Ticket'} [${ticket.id}]
From: ${ticket.name} <${ticket.email}>
Subject: ${ticket.subject}

${messageText || ticket.description}

Open Admin Panel: ${adminUrl}
  `.trim();

  return postResendEmail({
    to: config.supportEmail,
    subject,
    html,
    text,
    replyTo: ticket.email,
  });
}

// -------------------------------------------------------------
// F. Customer OTP / Magic Link Verification Email
// -------------------------------------------------------------
export async function sendCustomerOtpEmail(ticket, otpCode, magicToken) {
  const config = getEmailConfig();
  const magicLink = `${config.appBaseUrl}/support/track?ticketId=${encodeURIComponent(ticket.id)}&token=${encodeURIComponent(magicToken)}`;
  const subject = `Your KIVO Support Verification Code: ${otpCode}`;

  const html = renderEmailWrapper({
    title: subject,
    preheader: `Your one-time security code is ${otpCode}`,
    content: `
      <div class="badge">${ticket.id}</div>
      <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">Verify Your Email Ownership</h2>
      <p>Hello <strong>${ticket.name}</strong>,</p>
      <p>You requested access to ticket <strong>[${ticket.id}]</strong> ("${ticket.subject}"). Use the one-time verification code below:</p>

      <div style="text-align: center; margin: 28px 0;">
        <div style="display: inline-block; background: rgba(14, 165, 233, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); padding: 14px 32px; border-radius: 12px; font-family: ui-monospace, Menlo, Monaco, Consolas, monospace; font-size: 30px; font-weight: 800; letter-spacing: 6px; color: #38bdf8;">
          ${otpCode}
        </div>
      </div>

      <p style="text-align: center; font-size: 13px; color: #94a3b8;">
        This code expires in 15 minutes and can only be used once.
      </p>

      <p style="text-align: center; margin-top: 20px;">
        Or click below to sign in instantly with a secure magic link:
      </p>

      <div style="text-align: center;">
        <a href="${magicLink}" class="button">Log In Instantly via Magic Link</a>
      </div>

      <p style="font-size: 11px; color: #64748b; margin-top: 24px;">
        If you did not request this verification code, you can safely ignore this email.
      </p>
    `,
  });

  const text = `
Hello ${ticket.name},

Your one-time verification code to view ticket [${ticket.id}] is: ${otpCode}
This code expires in 15 minutes.

Or log in instantly via:
${magicLink}

KIVO Support
  `.trim();

  return postResendEmail({
    to: ticket.email,
    subject,
    html,
    text,
  });
}


// -------------------------------------------------------------
// G. Customer System Notifications (Welcome, Reset, Alerts)
// -------------------------------------------------------------
export async function sendCustomerEmail({ to, subject, html, text }) {
  return postResendEmail({
    to,
    subject,
    html,
    text,
  });
}
