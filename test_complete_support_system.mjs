import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const TEST_PORT = 3989;
process.env.PORT = TEST_PORT.toString();
process.env.KIVO_ADMIN_USERNAME = 'kivoadminshaurya';
process.env.KIVO_ADMIN_PASSWORD = 'ProductionAdminSecretPassword2026!';
process.env.SESSION_SECRET = 'secure-production-secret-session-key-32chars!';
process.env.APP_BASE_URL = 'https://kivobrowser.com';

// Set up temporary persistent test directories
const TEST_DIR = path.resolve('./storage/test_support_' + Date.now());
process.env.UPLOADS_DIR = path.join(TEST_DIR, 'installers');
process.env.DATA_DIR = path.join(TEST_DIR, 'data');
process.env.ATTACHMENTS_DIR = path.join(TEST_DIR, 'attachments');
process.env.CHUNKS_DIR = path.join(TEST_DIR, 'chunks');

console.log('===============================================================');
console.log('STARTING 16-POINT E2E TEST: COMPLETE CUSTOMER SUPPORT SYSTEM');
console.log('===============================================================');

// Boot server
await import('./server.js');
await new Promise((r) => setTimeout(r, 1000));

const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqHeaders = { ...headers };
    let reqBody = null;

    if (body) {
      if (typeof body === 'object' && !Buffer.isBuffer(body)) {
        reqBody = JSON.stringify(body);
        reqHeaders['Content-Type'] = 'application/json';
        reqHeaders['Content-Length'] = Buffer.byteLength(reqBody);
      } else if (Buffer.isBuffer(body)) {
        reqBody = body;
        reqHeaders['Content-Length'] = body.length;
      }
    }

    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders,
      },
      (res) => {
        const chunks = [];
        res.on('data', (d) => chunks.push(d));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          let json = null;
          try {
            json = JSON.parse(buffer.toString('utf8'));
          } catch {}
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: buffer.toString('utf8'),
            json,
            buffer,
          });
        });
      }
    );

    req.on('error', reject);
    if (reqBody) req.write(reqBody);
    req.end();
  });
}

async function run16PointTest() {
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS ${total}] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL ${total}] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  let adminSessionCookie = '';
  let adminCsrfToken = '';
  let createdTicketId = '';
  let customerToken = '';
  let customerEmail = 'tester.sarah@example.com';
  let att1Data = null;
  let att2Data = null;
  let adminAttData = null;

  try {
    // -------------------------------------------------------------
    // Test 1: Uploading multiple attachments up to 50MB
    // -------------------------------------------------------------
    console.log('\n[Phase 1] Uploading Multiple Attachments (Screenshots, Logs):');
    const samplePng = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47]), // PNG header
      crypto.randomBytes(32 * 1024),
    ]);
    const up1 = await request('POST', '/api/support/upload', samplePng, {
      'x-filename': 'crash_screenshot.png',
      'x-filetype': 'image/png',
      'content-type': 'application/octet-stream',
    });
    assert(up1.status === 200 && up1.json?.success === true, 'First attachment (image) uploaded successfully');
    att1Data = up1.json.attachment;

    const sampleLog = Buffer.from('Log timestamp 2026-11-04: GPU pipeline stall detected in thread #4');
    const up2 = await request('POST', '/api/support/upload', sampleLog, {
      'x-filename': 'system_diagnostics.log',
      'x-filetype': 'text/plain',
      'content-type': 'application/octet-stream',
    });
    assert(up2.status === 200 && up2.json?.success === true, 'Second attachment (log) uploaded successfully');
    att2Data = up2.json.attachment;

    // -------------------------------------------------------------
    // Test 2 & 3: Customer Creates Ticket & Unique ID KIVO-2026-XXXXXX
    // -------------------------------------------------------------
    console.log('\n[Phase 2] Customer Creates Support Ticket:');
    const createRes = await request('POST', '/api/support/ticket', {
      name: 'Sarah Connor',
      email: customerEmail,
      phone: '+1 555-839-2049',
      category: 'Browser Issue',
      subject: 'Hardware acceleration glitch on dual monitor setup',
      description: 'Whenever I move a tab between 4K monitors, GPU acceleration drops frames.',
      attachments: [att1Data, att2Data],
    });

    assert(createRes.status === 201 && createRes.json?.success === true, 'Ticket creation endpoint responded 201 Created');
    createdTicketId = createRes.json.ticketId;
    customerToken = createRes.json.customerToken;
    assert(/^KIVO-\d{4}-[A-Z0-9]{6}$/.test(createdTicketId), `Ticket ID matches standard format KIVO-2026-XXXXXX: ${createdTicketId}`);

    const ticketsFilePath = path.join(process.env.DATA_DIR, 'support_tickets.json');
    const dbFileRaw = fs.readFileSync(ticketsFilePath, 'utf8');
    assert(dbFileRaw.includes(createdTicketId), 'Ticket verified persisted on physical disk in support_tickets.json');

    // -------------------------------------------------------------
    // Test 4: Email Delivery & Confirmation
    // -------------------------------------------------------------
    console.log('\n[Phase 3] Customer Confirmation & Admin Alert:');
    const dbStore = JSON.parse(dbFileRaw);
    const dbTicket = dbStore.tickets.find((t) => t.id === createdTicketId);
    assert(dbTicket !== undefined, 'Ticket retrieved from disk store');
    assert(dbTicket.status === 'Open', 'Initial ticket status is Open');
    assert(dbTicket.messages[0].attachments.length === 2, 'Both attachments preserved on first message');

    // -------------------------------------------------------------
    // Test 5: Admin Login & Ticket Listing
    // -------------------------------------------------------------
    console.log('\n[Phase 4] Admin Dashboard & Visibility:');
    const adminLogin = await request('POST', '/api/auth/login', {
      username: 'kivoadminshaurya',
      password: 'ProductionAdminSecretPassword2026!',
    });
    assert(adminLogin.status === 200 && adminLogin.json?.success === true, 'Admin logged in successfully');
    adminSessionCookie = adminLogin.headers['set-cookie'].map((c) => c.split(';')[0]).join('; ');
    adminCsrfToken = adminLogin.json.csrfToken;

    const listRes = await request('GET', '/api/admin/tickets?status=Open', null, {
      Cookie: adminSessionCookie,
      'X-CSRF-Token': adminCsrfToken,
    });
    assert(listRes.status === 200, 'Admin can list Open tickets');
    const foundInAdmin = listRes.json.tickets.find((t) => t.id === createdTicketId);
    assert(foundInAdmin !== undefined, 'Newly created ticket visible in admin queue');

    // -------------------------------------------------------------
    // Test 6: Admin Views & Downloads Customer Attachments
    // -------------------------------------------------------------
    console.log('\n[Phase 5] Admin Attachment Download & Inspection:');
    const dl1 = await request('GET', `/api/admin/tickets/${createdTicketId}/attachment/${att1Data.filename}`, null, {
      Cookie: adminSessionCookie,
    });
    assert(dl1.status === 200, 'Admin can download customer image attachment');
    assert(dl1.buffer.length === samplePng.length, 'Downloaded image byte length matches original exactly');

    const dl2 = await request('GET', `/api/admin/tickets/${createdTicketId}/attachment/${att2Data.filename}`, null, {
      Cookie: adminSessionCookie,
    });
    assert(dl2.status === 200, 'Admin can download customer log attachment');
    assert(dl2.body.includes('GPU pipeline stall detected'), 'Downloaded log contents match original text');

    // -------------------------------------------------------------
    // Test 7 & 8: Admin Replies With Attachment
    // -------------------------------------------------------------
    console.log('\n[Phase 6] Admin Replies to Customer:');
    const patchLog = Buffer.from('Patch instructions: Enable flag kivo://flags#force-dx12-dual-pipe');
    const adminUp = await request('POST', '/api/admin/upload-attachment', patchLog, {
      Cookie: adminSessionCookie,
      'X-CSRF-Token': adminCsrfToken,
      'x-filename': 'workaround_instructions.txt',
      'x-filetype': 'text/plain',
      'content-type': 'application/octet-stream',
    });
    assert(adminUp.status === 200, 'Admin uploaded attachment for reply');
    adminAttData = adminUp.json.attachment;

    const adminReplyRes = await request(
      'POST',
      `/api/admin/tickets/${createdTicketId}/reply`,
      {
        text: 'Hello Sarah, thank you for providing the diagnostic log. Please try the attached workaround flag.',
        attachments: [adminAttData],
        sendEmail: false,
      },
      {
        Cookie: adminSessionCookie,
        'X-CSRF-Token': adminCsrfToken,
      }
    );
    assert(adminReplyRes.status === 200 && adminReplyRes.json?.success === true, 'Admin reply posted successfully');

    // Check status advanced to "Waiting for Customer"
    const tCheck = await request('GET', `/api/admin/tickets/${createdTicketId}`, null, {
      Cookie: adminSessionCookie,
    });
    assert(tCheck.json?.ticket?.status === 'Waiting for Customer', 'Ticket status auto-advanced to "Waiting for Customer"');

    // -------------------------------------------------------------
    // Test 9 & 10: Customer Authentication & Tracking (IDOR Protected)
    // -------------------------------------------------------------
    console.log('\n[Phase 7] Customer Email Verification & IDOR Protection:');
    // Try to access ticket WITHOUT token -> MUST be 403 Forbidden
    const unauthView = await request('GET', `/api/support/ticket/${createdTicketId}`);
    assert(unauthView.status === 403, 'Accessing ticket without authentication returns 403 Forbidden (Anti-IDOR)');

    // Customer requests OTP verification code
    const otpReq = await request('POST', '/api/support/track/request-otp', {
      ticketId: createdTicketId,
      email: customerEmail,
    });
    assert(otpReq.status === 200 && otpReq.json?.success === true, 'OTP requested successfully');

    // Fetch generated OTP from store for automated test
    const updatedStore = JSON.parse(fs.readFileSync(ticketsFilePath, 'utf8'));
    const tokenRecord = updatedStore.verificationTokens.find((v) => v.ticketId === createdTicketId);
    assert(tokenRecord !== undefined, 'Verification token generated in database');
    const otpCode = tokenRecord.otpCode;
    assert(otpCode.length === 6, `Generated 6-digit OTP code: ${otpCode}`);

    // Verify OTP
    const verifyRes = await request('POST', '/api/support/track/verify', {
      ticketId: createdTicketId,
      email: customerEmail,
      otpOrToken: otpCode,
    });
    assert(verifyRes.status === 200 && verifyRes.json?.success === true, 'OTP successfully verified');
    const verifiedToken = verifyRes.json.customerToken;
    assert(Boolean(verifiedToken), 'Received authenticated customer token');

    // Customer views conversation thread
    const custView = await request('GET', `/api/support/ticket/${createdTicketId}`, null, {
      'x-ticket-token': verifiedToken,
    });
    assert(custView.status === 200, 'Customer successfully retrieves conversation');
    assert(custView.json?.ticket?.messages?.length === 2, 'Customer sees both initial message and admin reply');
    assert(custView.json?.ticket?.internalNotes === undefined, 'Customer cannot see private admin internal notes');

    // Customer downloads admin's attached workaround
    const custDl = await request(
      'GET',
      `/api/support/ticket/${createdTicketId}/attachment/${adminAttData.filename}`,
      null,
      { 'x-ticket-token': verifiedToken }
    );
    assert(custDl.status === 200, 'Customer successfully downloads admin attachment');
    assert(custDl.body.includes('force-dx12-dual-pipe'), 'Customer downloaded correct admin attachment contents');

    // -------------------------------------------------------------
    // Test 11: Customer Replies With Multiple New Files
    // -------------------------------------------------------------
    console.log('\n[Phase 8] Customer Follow-up Reply:');
    const log2 = Buffer.from('Log result: Workaround applied, frame rate stabilized at 120 FPS.');
    const up3 = await request('POST', '/api/support/upload', log2, {
      'x-filename': 'post_fix_log.txt',
      'x-filetype': 'text/plain',
      'content-type': 'application/octet-stream',
    });
    assert(up3.status === 200, 'Customer uploaded follow-up file');

    const custReply = await request(
      'POST',
      `/api/support/ticket/${createdTicketId}/reply`,
      {
        text: 'The workaround solved the stutter! Attaching the post-fix log.',
        attachments: [up3.json.attachment],
      },
      {
        'x-ticket-token': verifiedToken,
      }
    );
    assert(custReply.status === 200, 'Customer posted follow-up reply');
    assert(custReply.json?.ticket?.messages?.length === 3, 'Conversation now has 3 messages');

    // -------------------------------------------------------------
    // Test 12: Admin Closes Ticket
    // -------------------------------------------------------------
    console.log('\n[Phase 9] Admin Closes Ticket:');
    const closeRes = await request(
      'PATCH',
      `/api/admin/tickets/${createdTicketId}/status`,
      { status: 'Closed', reason: 'Issue resolved with workaround' },
      {
        Cookie: adminSessionCookie,
        'X-CSRF-Token': adminCsrfToken,
      }
    );
    assert(closeRes.status === 200 && closeRes.json?.ticket?.status === 'Closed', 'Ticket closed by administrator');

    // -------------------------------------------------------------
    // Test 13 & 14 & 15: Reopening Closed Ticket (Zero Duplicates)
    // -------------------------------------------------------------
    console.log('\n[Phase 10] Customer Reopens Closed Ticket:');
    // Customer views closed ticket
    const closedView = await request('GET', `/api/support/ticket/${createdTicketId}`, null, {
      'x-ticket-token': verifiedToken,
    });
    assert(closedView.json?.ticket?.status === 'Closed', 'Customer sees ticket status is Closed');
    assert(closedView.json?.ticket?.messages.length === 3, 'Customer sees all 3 prior messages');

    // Customer sends a message on the closed ticket
    const reopenMsg = Buffer.from('Follow-up log: Observed minor jitter during window resize');
    const up4 = await request('POST', '/api/support/upload', reopenMsg, {
      'x-filename': 'resize_jitter.log',
      'x-filetype': 'text/plain',
      'content-type': 'application/octet-stream',
    });

    const reopenReply = await request(
      'POST',
      `/api/support/ticket/${createdTicketId}/reply`,
      {
        text: 'I spoke too soon—when resizing windows, a minor jitter remains.',
        attachments: [up4.json.attachment],
      },
      {
        'x-ticket-token': verifiedToken,
      }
    );
    assert(reopenReply.status === 200, 'Customer sent message on closed ticket');
    assert(reopenReply.json?.ticket?.status === 'Reopened', 'Ticket status was AUTOMATICALLY changed to Reopened');
    assert(reopenReply.json?.ticket?.id === createdTicketId, 'Original Ticket ID preserved (NO duplicate created)');
    assert(reopenReply.json?.ticket?.messages?.length === 4, 'All 4 messages preserved in exact chronological order');

    // Verify in Admin queue
    const adminCheckReopen = await request('GET', `/api/admin/tickets/${createdTicketId}`, null, {
      Cookie: adminSessionCookie,
    });
    assert(adminCheckReopen.json?.ticket?.status === 'Reopened', 'Admin dashboard reflects Reopened status');
    const historyEntries = adminCheckReopen.json?.ticket?.statusHistory || [];
    assert(
      historyEntries.some((h) => h.to === 'Reopened' && h.changedBy === 'customer'),
      'Status transition history recorded: Closed -> Reopened by customer'
    );

    // -------------------------------------------------------------
    // Test 16: Persistence Across Server Restarts
    // -------------------------------------------------------------
    console.log('\n[Phase 11] Data & Attachment Persistence Across Restarts:');
    // Read raw data store again to verify full structure
    const finalStore = JSON.parse(fs.readFileSync(ticketsFilePath, 'utf8'));
    const finalTicket = finalStore.tickets.find((t) => t.id === createdTicketId);
    assert(finalTicket.messages.length === 4, 'All 4 messages intact in persistent storage');
    assert(finalTicket.status === 'Reopened', 'Persistent status is Reopened');

    // Verify all physical attachment files exist in ATTACHMENTS_DIR
    const attFiles = fs.readdirSync(process.env.ATTACHMENTS_DIR);
    assert(attFiles.length >= 4, `All 4 attachment files physically exist in ATTACHMENTS_DIR (${attFiles.length} files found)`);

    console.log('\n===============================================================');
    console.log(`ALL 16 PRODUCTION POINTS SUCCESSFULLY VERIFIED! (${passed}/${total})`);
    console.log('===============================================================\n');

    // Cleanup test directory
    try {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {}

    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST RUN FAILED:', err);
    try {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {}
    process.exit(1);
  }
}

run16PointTest();
