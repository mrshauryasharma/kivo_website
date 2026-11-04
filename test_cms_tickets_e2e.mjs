import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const TEST_PORT = 3987;
process.env.PORT = TEST_PORT.toString();
process.env.KIVO_ADMIN_USERNAME = 'kivoadminshaurya';
process.env.KIVO_ADMIN_PASSWORD = 'TestSecureAdminPassword123!';
process.env.SESSION_SECRET = 'test-session-secret-key-32characters!';

// Set temporary isolated storage directory for tests
const TEST_DIR = path.resolve('./storage/test_run_' + Date.now());
process.env.UPLOADS_DIR = path.join(TEST_DIR, 'installers');
process.env.DATA_DIR = path.join(TEST_DIR, 'data');
process.env.ATTACHMENTS_DIR = path.join(TEST_DIR, 'attachments');
process.env.CHUNKS_DIR = path.join(TEST_DIR, 'chunks');

console.log('--- STARTING COMPREHENSIVE KIVO BACKEND E2E TEST ---');

// Dynamically import server.js to boot the app
await import('./server.js');

// Give server 1 second to start listening
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

let sessionCookie = '';
let csrfToken = '';

async function runTests() {
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // 1. Health check
    console.log('\n1. Testing Health Endpoint:');
    const health = await request('GET', '/health');
    assert(health.status === 200, 'Health endpoint responds with HTTP 200');
    assert(health.json?.status === 'ok', 'Health status is ok');

    // 2. Public CMS Content
    console.log('\n2. Testing Public CMS Content:');
    const pubCms = await request('GET', '/api/content');
    assert(pubCms.status === 200, 'Public content endpoint responds 200');
    assert(pubCms.json?.content?.hero?.title !== undefined, 'CMS returns hero section');
    assert(pubCms.json?.content?.ceo?.name === 'Shaurya Sharma', 'CMS returns CEO Shaurya Sharma');

    // 3. Support Ticket Submission (Public)
    console.log('\n3. Testing Support Ticket Creation:');
    const ticketPayload = {
      name: 'John Test User',
      email: 'john.test@example.com',
      phone: '+1 555-0199',
      category: 'Browser issue',
      subject: 'Tab crash on heavy site',
      description: 'The browser encountered an unexpected crash when opening 20 tabs simultaneously.',
      attachment: {
        name: 'crash_log.txt',
        type: 'text/plain',
        size: 28,
        base64: 'data:text/plain;base64,' + Buffer.from('Error trace log: Crash at 0x01').toString('base64'),
      },
    };

    const submitRes = await request('POST', '/api/support/ticket', ticketPayload);
    assert(submitRes.status === 201, 'Support ticket created with HTTP 201');
    assert(submitRes.json?.success === true, 'Ticket creation reports success: true');
    assert(submitRes.json?.ticketId?.startsWith('KIVO-TKT-'), `Valid Ticket ID generated: ${submitRes.json?.ticketId}`);
    const createdTicketId = submitRes.json.ticketId;

    // 4. Admin Authentication
    console.log('\n4. Testing Admin Authentication:');
    const loginFail = await request('POST', '/api/auth/login', {
      username: 'kivoadminshaurya',
      password: 'WrongPassword!',
    });
    assert(loginFail.status === 401, 'Rejects invalid password with HTTP 401');

    const loginSuccess = await request('POST', '/api/auth/login', {
      username: 'kivoadminshaurya',
      password: 'TestSecureAdminPassword123!',
    });
    assert(loginSuccess.status === 200, 'Admin login succeeds with HTTP 200');
    assert(loginSuccess.json?.success === true, 'Admin login returns success');

    const cookies = loginSuccess.headers['set-cookie'];
    assert(Array.isArray(cookies) && cookies.length > 0, 'Returns session and CSRF cookies');
    sessionCookie = cookies.map((c) => c.split(';')[0]).join('; ');
    csrfToken = loginSuccess.json.csrfToken;
    assert(Boolean(csrfToken), 'Received CSRF token');

    // Verify session
    const meRes = await request('GET', '/api/auth/me', null, { Cookie: sessionCookie });
    assert(meRes.json?.authenticated === true, 'Session is verified by /api/auth/me');

    // 5. Admin Support Ticket Operations
    console.log('\n5. Testing Admin Ticket Management:');
    const ticketList = await request('GET', '/api/admin/tickets', null, {
      Cookie: sessionCookie,
      'X-CSRF-Token': csrfToken,
    });
    assert(ticketList.status === 200, 'Admin can list tickets');
    assert(ticketList.json?.tickets?.length > 0, 'Found created ticket in list');

    // Fetch ticket detail
    const ticketDetail = await request('GET', `/api/admin/tickets/${createdTicketId}`, null, {
      Cookie: sessionCookie,
      'X-CSRF-Token': csrfToken,
    });
    assert(ticketDetail.json?.ticket?.id === createdTicketId, 'Admin can retrieve ticket detail');
    assert(ticketDetail.json?.ticket?.attachment?.originalName === 'crash_log.txt', 'Attachment metadata preserved');

    // Download ticket attachment securely
    const downloadAtt = await request('GET', `/api/admin/tickets/${createdTicketId}/attachment`, null, {
      Cookie: sessionCookie,
      'X-CSRF-Token': csrfToken,
    });
    assert(downloadAtt.status === 200, 'Admin can download ticket attachment');
    assert(downloadAtt.body.includes('Error trace log: Crash at 0x01'), 'Attachment content matches original');

    // Admin reply
    const replyRes = await request(
      'POST',
      `/api/admin/tickets/${createdTicketId}/reply`,
      { text: 'Thank you John. We have identified the memory issue and will patch it in v1.0.1.', sendEmail: false },
      { Cookie: sessionCookie, 'X-CSRF-Token': csrfToken }
    );
    assert(replyRes.status === 200, 'Admin reply posted successfully');
    assert(replyRes.json?.success === true, 'Reply returns success: true');

    // Admin internal note
    const noteRes = await request(
      'POST',
      `/api/admin/tickets/${createdTicketId}/note`,
      { text: 'Investigating Chrome heap trace under Windows 11.' },
      { Cookie: sessionCookie, 'X-CSRF-Token': csrfToken }
    );
    assert(noteRes.status === 200, 'Internal note posted successfully');

    // Update status
    const statusRes = await request(
      'PATCH',
      `/api/admin/tickets/${createdTicketId}/status`,
      { status: 'In Progress' },
      { Cookie: sessionCookie, 'X-CSRF-Token': csrfToken }
    );
    assert(statusRes.json?.ticket?.status === 'In Progress', 'Status successfully changed to In Progress');

    // 6. Admin CMS Lifecycle (Draft -> Publish -> Revert)
    console.log('\n6. Testing CMS Lifecycle:');
    const adminCms = await request('GET', '/api/admin/cms', null, {
      Cookie: sessionCookie,
      'X-CSRF-Token': csrfToken,
    });
    assert(adminCms.status === 200, 'Admin can fetch full CMS state');

    // Update Draft
    const draft = adminCms.json.draft;
    draft.announcement.isEnabled = true;
    draft.announcement.message = 'Special Announcement: KIVO v1.0.1 Launching Soon!';

    const saveDraftRes = await request(
      'PUT',
      '/api/admin/cms/draft',
      { draft },
      { Cookie: sessionCookie, 'X-CSRF-Token': csrfToken }
    );
    assert(saveDraftRes.status === 200, 'Draft saved successfully');

    // Verify public site still shows UNMODIFIED announcement until published
    const prePub = await request('GET', '/api/content');
    assert(prePub.json?.content?.announcement?.isEnabled === false, 'Public content remains unaffected while draft is uncommitted');

    // Publish to live site
    const pubRes = await request(
      'POST',
      '/api/admin/cms/publish',
      { note: 'Enabled announcement banner' },
      { Cookie: sessionCookie, 'X-CSRF-Token': csrfToken }
    );
    assert(pubRes.status === 200, 'Content published successfully');
    const revId = pubRes.json.revisionId;

    // Verify public site now reflects published update
    const postPub = await request('GET', '/api/content');
    assert(postPub.json?.content?.announcement?.isEnabled === true, 'Public site reflects published announcement banner');

    // Revert to initial baseline
    const historyRes = await request('GET', '/api/admin/cms/history', null, {
      Cookie: sessionCookie,
      'X-CSRF-Token': csrfToken,
    });
    assert(historyRes.json?.history?.length >= 2, 'History tracks revisions');
    const initialRev = historyRes.json.history[historyRes.json.history.length - 1];

    const revertRes = await request(
      'POST',
      '/api/admin/cms/revert',
      { revisionId: initialRev.id },
      { Cookie: sessionCookie, 'X-CSRF-Token': csrfToken }
    );
    assert(revertRes.status === 200, 'Revert succeeds with HTTP 200');

    const revertedPub = await request('GET', '/api/content');
    assert(revertedPub.json?.content?.announcement?.isEnabled === false, 'Public site reverted successfully');

    // 7. Installer Chunked Upload & Atomic Swap
    console.log('\n7. Testing Chunked Upload & Atomic Replacement:');
    const binaryData = crypto.randomBytes(64 * 1024); // 64 KB test binary
    const chunkSize = 32 * 1024;
    const totalChunks = 2;

    // Step 1: Init
    const initRes = await request(
      'POST',
      '/api/admin/upload/init',
      {
        platform: 'windows',
        filename: 'KivoSetup-x64.exe',
        version: '1.0.0',
        totalSize: binaryData.length,
        totalChunks,
      },
      { Cookie: sessionCookie, 'X-CSRF-Token': csrfToken }
    );
    assert(initRes.status === 200, 'Upload initialized');
    const uploadId = initRes.json.uploadId;

    // Step 2: Upload 2 chunks
    const chunk0 = binaryData.subarray(0, chunkSize);
    const chunk1 = binaryData.subarray(chunkSize);

    const c0Res = await request(
      'POST',
      `/api/admin/upload/chunk?uploadId=${uploadId}&chunkIndex=0`,
      chunk0,
      {
        Cookie: sessionCookie,
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'application/octet-stream',
      }
    );
    assert(c0Res.status === 200, 'Chunk 0 received');

    const c1Res = await request(
      'POST',
      `/api/admin/upload/chunk?uploadId=${uploadId}&chunkIndex=1`,
      chunk1,
      {
        Cookie: sessionCookie,
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'application/octet-stream',
      }
    );
    assert(c1Res.status === 200, 'Chunk 1 received');

    // Step 3: Complete upload
    const compRes = await request(
      'POST',
      '/api/admin/upload/complete',
      { uploadId },
      { Cookie: sessionCookie, 'X-CSRF-Token': csrfToken }
    );
    assert(compRes.status === 200, 'Upload assembled and completed atomically');
    assert(compRes.json?.metadata?.sha256 === crypto.createHash('sha256').update(binaryData).digest('hex'), 'SHA-256 matches perfectly');

    // Verify stream download
    const streamRes = await request('GET', '/api/download/windows');
    assert(streamRes.status === 200, 'Download stream responds 200');
    assert(streamRes.buffer.length === binaryData.length, 'Streamed bytes match uploaded binary exactly');

    // Range request (e.g. download resume)
    const rangeRes = await request('GET', '/api/download/windows', null, { Range: 'bytes=0-1023' });
    assert(rangeRes.status === 206, 'Supports HTTP 206 Partial Content for resumed downloads');
    assert(rangeRes.buffer.length === 1024, 'Partial byte slice matches requested range');

    console.log(`\n========================================`);
    console.log(`ALL TESTS PASSED! (${passed}/${total})`);
    console.log(`========================================\n`);

    // Clean up test dir
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

runTests();
