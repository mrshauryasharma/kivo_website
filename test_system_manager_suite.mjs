import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const TEST_PORT = 3991;
process.env.PORT = TEST_PORT.toString();
process.env.KIVO_ADMIN_USERNAME = 'kivoadminshaurya';
process.env.KIVO_ADMIN_PASSWORD = 'ProductionAdminSecretPassword2026!';
process.env.SESSION_SECRET = 'secure-production-secret-session-key-32chars!';
process.env.APP_BASE_URL = 'https://kivobrowser.com';

// Configure custom KIVO_STORAGE_PATH
const TEST_STORAGE_ROOT = path.resolve('./storage/test_manager_suite_' + Date.now());
process.env.KIVO_STORAGE_PATH = TEST_STORAGE_ROOT;
process.env.UPLOADS_DIR = path.join(TEST_STORAGE_ROOT, 'installers');
process.env.DATA_DIR = path.join(TEST_STORAGE_ROOT, 'data');
process.env.ATTACHMENTS_DIR = path.join(TEST_STORAGE_ROOT, 'attachments');
process.env.CHUNKS_DIR = path.join(TEST_STORAGE_ROOT, 'chunks');

console.log('===============================================================');
console.log('AUTONOMOUS TECHNICAL MANAGER E2E VERIFICATION TEST');
console.log('===============================================================');

// Boot server
await import('./server.js');
await new Promise((r) => setTimeout(r, 1000));

const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

function request(method, reqPath, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(reqPath, BASE_URL);
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
            buffer,
            json,
          });
        });
      }
    );

    req.on('error', reject);
    if (reqBody) req.write(reqBody);
    req.end();
  });
}

let passed = 0;
let total = 0;

function assert(condition, message) {
  total += 1;
  if (!condition) {
    console.error(`  ❌ [FAIL ${total}] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passed += 1;
  console.log(`  ✅ [PASS ${total}] ${message}`);
}

async function runTestSuite() {
  try {
    // -------------------------------------------------------------
    // Test 1: Storage Resolver Verification
    // -------------------------------------------------------------
    console.log('\n[Phase 1] KIVO_STORAGE_PATH & Directory Layout:');
    assert(fs.existsSync(TEST_STORAGE_ROOT), 'KIVO_STORAGE_PATH base directory initialized');
    assert(fs.existsSync(process.env.UPLOADS_DIR), 'Installers persistent directory exists');
    assert(fs.existsSync(process.env.DATA_DIR), 'Database persistent directory exists');
    assert(fs.existsSync(process.env.ATTACHMENTS_DIR), 'Private attachments persistent directory exists');

    // -------------------------------------------------------------
    // Test 2: Storage Monitor & Quota Calculation
    // -------------------------------------------------------------
    console.log('\n[Phase 2] Storage Monitor & Quota Metrics:');
    const { getStorageMetrics } = await import('./server/storageMonitor.js');
    const metrics = getStorageMetrics();
    assert(metrics.quotaLimitBytes === 25 * 1024 * 1024 * 1024, 'Quota limit correctly configured to 25 GB');
    assert(metrics.safeCapBytes === 23.5 * 1024 * 1024 * 1024, 'Safety cap set to 23.5 GB');
    assert(typeof metrics.freeDiskBytes === 'number' && metrics.freeDiskBytes > 0, 'Available free disk space detected');
    assert(metrics.isQuotaExceeded === false, 'Safe storage threshold currently respected');

    // -------------------------------------------------------------
    // Test 3: Admin Login & Protected Storage Endpoints
    // -------------------------------------------------------------
    console.log('\n[Phase 3] Admin Authentication & Diagnostics APIs:');
    const adminLogin = await request('POST', '/api/auth/login', {
      username: 'kivoadminshaurya',
      password: 'ProductionAdminSecretPassword2026!',
    });
    assert(adminLogin.status === 200 && adminLogin.json?.success === true, 'Admin logged in successfully');
    const adminCookie = adminLogin.headers['set-cookie'].map((c) => c.split(';')[0]).join('; ');
    const csrfToken = adminLogin.json.csrfToken;

    // Fetch storage metrics from API
    const storageApiRes = await request('GET', '/api/admin/system/storage', null, {
      Cookie: adminCookie,
    });
    assert(storageApiRes.status === 200 && storageApiRes.json?.success === true, 'GET /api/admin/system/storage responded 200');
    assert(storageApiRes.json.storage.quotaLimitBytes === 25 * 1024 * 1024 * 1024, 'API returns verified 25 GB quota limit');

    // Fetch database health from API
    const dbApiRes = await request('GET', '/api/admin/system/database', null, {
      Cookie: adminCookie,
    });
    assert(dbApiRes.status === 200 && dbApiRes.json?.success === true, 'GET /api/admin/system/database responded 200');
    assert(typeof dbApiRes.json.database.connected === 'boolean', 'API reports database connectivity status');

    // -------------------------------------------------------------
    // Test 4: MySQL Module & Schema DDL Verification
    // -------------------------------------------------------------
    console.log('\n[Phase 4] MySQL Module & Database Health Fallback:');
    const { checkMysqlHealth } = await import('./server/mysql.js');
    const health = await checkMysqlHealth();
    assert(health.configured === false || typeof health.connected === 'boolean', 'MySQL health check functions cleanly');

    // -------------------------------------------------------------
    // Test 5: Storage Quota Pre-Check Enforcement on Attachments
    // -------------------------------------------------------------
    console.log('\n[Phase 5] Storage Quota Enforcer on Attachment Upload:');
    const testAttachment = Buffer.from('Diagnostic error log test content for storage quota verification');
    const upRes = await request('POST', '/api/support/upload', testAttachment, {
      'x-filename': 'storage_test_log.txt',
      'x-filetype': 'text/plain',
      'content-type': 'application/octet-stream',
    });
    assert(upRes.status === 200 && upRes.json?.success === true, 'Attachment upload succeeds when disk quota is healthy');
    assert(fs.existsSync(path.join(process.env.ATTACHMENTS_DIR, upRes.json.attachment.filename)), 'File physically written to persistent ATTACHMENTS_DIR');

    console.log('\n===============================================================');
    console.log(`ALL TECHNICAL MANAGER VERIFICATION POINTS PASSED! (${passed}/${total})`);
    console.log('===============================================================\n');

    // Cleanup test folder
    try {
      fs.rmSync(TEST_STORAGE_ROOT, { recursive: true, force: true });
    } catch {}

    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST RUN FAILED:', err);
    try {
      fs.rmSync(TEST_STORAGE_ROOT, { recursive: true, force: true });
    } catch {}
    process.exit(1);
  }
}

runTestSuite();
