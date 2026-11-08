import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import cookieParser from 'cookie-parser';

import {
  UPLOADS_DIR,
  DATA_DIR,
  ATTACHMENTS_DIR,
  MAX_FILE_SIZE,
  PLATFORM_RULES,
  logSafeAuthDiagnostics,
} from './server/config.js';
import {
  authenticateAdmin,
  invalidateSession,
  getSession,
  requireAdminAuth,
} from './server/auth.js';
import {
  getMetadata,
  deleteInstaller,
  handleDownloadStream,
} from './server/installers.js';
import {
  initUpload,
  writeChunk,
  completeUpload,
  cancelUpload,
} from './server/chunkedUpload.js';
import {
  handleGetPublishedContent,
  handleGetAdminCms,
  handleSaveDraft,
  handlePublishCms,
  handleRevertCms,
  handleGetHistory,
} from './server/cms.js';
import {
  handleFileUpload,
  handleTicketSubmission,
  handleRequestOtp,
  handleVerifyOtp,
  handleGetCustomerTicket,
  handleCustomerReply,
  handleListTickets,
  handleGetTicketDetails,
  handleAdminReply,
  handleAdminAddNote,
  handleAdminUpdateStatus,
  handleRetryEmail,
  handleStreamAttachment,
} from './server/tickets.js';
import {
  securityHeaders,
  corsProtection,
  blockRestrictedAccess,
  apiRateLimiter,
  validateUploadInitBody,
  validateUploadId,
  safeErrorHandler,
} from './server/security.js';
import { getStorageMetrics } from './server/storageMonitor.js';
import { checkMysqlHealth, getMysqlPool } from './server/mysql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const distPath = path.join(__dirname, 'dist');
const indexPath = path.join(distPath, 'index.html');

if (!fs.existsSync(distPath) || !fs.existsSync(indexPath)) {
  console.warn(
    'WARNING: dist folder or index.html not found! Make sure to run "npm run build" before starting the server.'
  );
}

// -------------------------------------------------------------
// Core Security Middlewares
// -------------------------------------------------------------
app.use(securityHeaders);
app.use(corsProtection);
app.use(blockRestrictedAccess);

// Rate limiters
app.use('/api/', apiRateLimiter('public'));
app.use('/api/admin/', apiRateLimiter('admin'));

// Body and cookie parsing
app.use(cookieParser());

// Direct binary payload parser for attachment uploads (up to 55MB)
app.use(
  ['/api/support/upload', '/api/admin/upload-attachment'],
  express.raw({ type: '*/*', limit: '55mb' })
);

// Standard JSON parser
app.use(express.json({ limit: '60mb' }));

// Raw binary body parser for chunked installer uploads (up to 25MB)
app.use(
  '/api/admin/upload/chunk',
  express.raw({ type: 'application/octet-stream', limit: '25mb' })
);

// -------------------------------------------------------------
// Public Endpoints (Health, Downloads, CMS, Support)
// -------------------------------------------------------------
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Public published CMS content
app.get('/api/content', handleGetPublishedContent);

// Support Attachment Upload (Accepts files up to 50 MB)
app.post('/api/support/upload', handleFileUpload);
app.post('/api/admin/upload-attachment', requireAdminAuth, handleFileUpload);

// Public support ticket submission
app.post('/api/support/ticket', handleTicketSubmission);

// Customer Ticket Tracking & Ownership Verification (IDOR Protected)
app.post('/api/support/track/request-otp', handleRequestOtp);
app.post('/api/support/track/verify', handleVerifyOtp);
app.get('/api/support/ticket/:id', handleGetCustomerTicket);
app.post('/api/support/ticket/:id/reply', handleCustomerReply);
app.get('/api/support/ticket/:id/attachment/:filename', handleStreamAttachment);

// Public status of installers (used dynamically by website download cards)
app.get('/api/downloads/status', (req, res) => {
  try {
    const meta = getMetadata();
    const publicStatus = {};
    for (const [key, rule] of Object.entries(PLATFORM_RULES)) {
      const item = meta[key];
      if (item && item.filePath && fs.existsSync(item.filePath)) {
        publicStatus[key] = {
          available: true,
          platform: item.platform,
          name: item.name,
          architecture: item.architecture,
          filename: item.filename,
          fileName: item.filename,
          version: item.version,
          size: item.size,
          sha256: item.sha256,
          uploadedAt: item.uploadedAt,
          downloadUrl: item.downloadUrl,
        };
      } else {
        publicStatus[key] = {
          available: false,
          platform: key,
          name: rule.name,
          architecture: rule.architecture,
          filename: null,
          version: null,
          size: null,
          downloadUrl: null,
        };
      }
    }
    res.status(200).json(publicStatus);
  } catch (err) {
    console.error('[KIVO API] Error fetching download status:', err);
    res.status(500).json({ error: 'Failed to retrieve download status.' });
  }
});

// Public installer download stream
app.get('/api/download/:platform', (req, res) => {
  const { platform } = req.params;
  if (!PLATFORM_RULES[platform]) {
    return res.status(404).send('Invalid platform specified.');
  }
  handleDownloadStream(req, res, platform);
});

// -------------------------------------------------------------
// Authentication Endpoints
// -------------------------------------------------------------
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const result = authenticateAdmin(username, password, clientIp);

  if (!result.success) {
    return res.status(result.status || 401).json({
      error: result.error,
      code: result.code,
    });
  }

  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';

  res.cookie('kivo_admin_session', result.sessionCookie, {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  });

  res.cookie('kivo_csrf_token', result.csrfToken, {
    httpOnly: false,
    secure: isHttps,
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  });

  res.status(200).json({
    success: true,
    user: { username: result.username },
    csrfToken: result.csrfToken,
    expiresAt: result.expiresAt,
  });
});

app.post('/api/auth/logout', (req, res) => {
  const sessionCookie = req.cookies?.kivo_admin_session;
  invalidateSession(sessionCookie);

  res.clearCookie('kivo_admin_session', { path: '/' });
  res.clearCookie('kivo_csrf_token', { path: '/' });
  res.status(200).json({ success: true, message: 'Logged out successfully.' });
});

app.get('/api/auth/me', (req, res) => {
  const sessionCookie = req.cookies?.kivo_admin_session;
  const session = getSession(sessionCookie);

  if (!session) {
    return res.status(200).json({ authenticated: false });
  }

  res.status(200).json({
    authenticated: true,
    user: { username: session.username },
    csrfToken: session.csrfToken,
    expiresAt: session.expiresAt,
  });
});

// -------------------------------------------------------------
// Protected Admin API Endpoints: Installers & Binary Storage
// -------------------------------------------------------------
app.get('/api/admin/installers', requireAdminAuth, async (req, res) => {
  try {
    const meta = getMetadata();
    const storageMetrics = getStorageMetrics();
    const dbHealth = await checkMysqlHealth();
    res.status(200).json({
      installers: meta,
      uploadsDir: UPLOADS_DIR,
      dataDir: DATA_DIR,
      maxFileSize: MAX_FILE_SIZE,
      platforms: PLATFORM_RULES,
      storage: storageMetrics,
      database: dbHealth,
    });
  } catch (err) {
    console.error('[KIVO API] Error listing installers:', err);
    res.status(500).json({ error: 'Failed to retrieve installer metadata.' });
  }
});

app.post('/api/admin/upload/init', requireAdminAuth, (req, res) => {
  try {
    const sanitizedParams = validateUploadInitBody(req.body, PLATFORM_RULES);
    const sessionInfo = initUpload(sanitizedParams);
    res.status(200).json(sessionInfo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/admin/upload/chunk', requireAdminAuth, (req, res) => {
  try {
    const uploadId = validateUploadId(
      (req.query.uploadId || req.headers['x-upload-id'])?.toString()
    );
    const chunkIndex = parseInt(
      (req.query.chunkIndex || req.headers['x-chunk-index'])?.toString(),
      10
    );

    if (isNaN(chunkIndex) || chunkIndex < 0) {
      return res.status(400).json({ error: 'Valid chunkIndex parameter is required.' });
    }

    const chunkBuffer = req.body;
    const result = writeChunk(uploadId, chunkIndex, chunkBuffer);
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/admin/upload/complete', requireAdminAuth, async (req, res) => {
  try {
    const uploadId = validateUploadId(req.body?.uploadId);
    const completedMetadata = await completeUpload(uploadId);
    res.status(200).json({
      success: true,
      metadata: completedMetadata,
      installer: completedMetadata,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/admin/upload/cancel', requireAdminAuth, (req, res) => {
  try {
    const uploadId = validateUploadId(req.body?.uploadId);
    cancelUpload(uploadId);
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/admin/installers/:platform', requireAdminAuth, (req, res) => {
  try {
    const { platform } = req.params;
    if (!PLATFORM_RULES[platform]) {
      return res.status(400).json({ error: 'Invalid platform parameter.' });
    }
    deleteInstaller(platform);
    res.status(200).json({ success: true, message: `Installer for ${platform} deleted.` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Protected Admin API Endpoints: Website CMS
// -------------------------------------------------------------
app.get('/api/admin/cms', requireAdminAuth, handleGetAdminCms);
app.put('/api/admin/cms/draft', requireAdminAuth, handleSaveDraft);
app.post('/api/admin/cms/publish', requireAdminAuth, handlePublishCms);
app.post('/api/admin/cms/revert', requireAdminAuth, handleRevertCms);
app.get('/api/admin/cms/history', requireAdminAuth, handleGetHistory);

// -------------------------------------------------------------
// Protected Admin API Endpoints: Support Tickets Dashboard
// -------------------------------------------------------------
app.get('/api/admin/tickets', requireAdminAuth, handleListTickets);
app.get('/api/admin/tickets/:id', requireAdminAuth, handleGetTicketDetails);
app.post('/api/admin/tickets/:id/reply', requireAdminAuth, handleAdminReply);
app.post('/api/admin/tickets/:id/note', requireAdminAuth, handleAdminAddNote);
app.patch('/api/admin/tickets/:id/status', requireAdminAuth, handleAdminUpdateStatus);
app.post('/api/admin/tickets/:id/retry-email', requireAdminAuth, handleRetryEmail);
app.get('/api/admin/tickets/:id/attachment/:filename', requireAdminAuth, handleStreamAttachment);

// -------------------------------------------------------------
// Protected Admin API Endpoints: System Storage & Database Diagnostics
// -------------------------------------------------------------
app.get('/api/admin/system/storage', requireAdminAuth, (req, res) => {
  try {
    const metrics = getStorageMetrics();
    res.status(200).json({ success: true, storage: metrics });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve storage metrics.' });
  }
});

app.get('/api/admin/system/database', requireAdminAuth, async (req, res) => {
  try {
    const health = await checkMysqlHealth();
    res.status(200).json({ success: true, database: health });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check database health.' });
  }
});

// Temporary Secure Diagnostic Endpoint: Outbound Public IPv4 Detection
app.get('/api/admin/system/outbound-ip', async (req, res) => {
  const token = req.headers['x-kivo-diag-token'];
  if (token !== 'kivo_diag_secure_ip_probe_2026_98af7c') {
    return res.status(401).json({ error: 'Unauthorized diagnostic access.' });
  }

  try {
    let outboundIp = null;
    let service = null;

    try {
      const resp = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(5000) });
      if (resp.ok) {
        const data = await resp.json();
        if (data.ip) {
          outboundIp = data.ip.trim();
          service = 'api.ipify.org';
        }
      }
    } catch {}

    if (!outboundIp) {
      try {
        const resp2 = await fetch('https://icanhazip.com', { signal: AbortSignal.timeout(5000) });
        if (resp2.ok) {
          const text = await resp2.text();
          if (text) {
            outboundIp = text.trim();
            service = 'icanhazip.com';
          }
        }
      } catch {}
    }

    if (outboundIp) {
      return res.status(200).json({
        success: true,
        outboundIp,
        service,
        detectedAt: new Date().toISOString(),
      });
    }

    res.status(502).json({ error: 'Could not detect outbound IP from external services.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Static Asset Serving & SPA Fallback
// -------------------------------------------------------------
app.use(
  express.static(distPath, {
    dotfiles: 'ignore',
    index: false,
    redirect: false,
    maxAge: '1d',
    setHeaders: (res, filePath) => {
      if (filePath.includes(path.sep + 'assets' + path.sep)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    },
  })
);

app.use((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(404).json({ error: 'Endpoint not found.' });
  }

  if (path.extname(req.path)) {
    return res.status(404).send('Not Found');
  }

  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Application build not found. Please run npm run build.');
  }
});

app.use(safeErrorHandler);

app.listen(PORT, HOST, () => {
  console.log(`[KIVO Web Server] Listening on http://${HOST}:${PORT}`);
  console.log(`[KIVO Web Server] Serving static files from: ${distPath}`);
  console.log(`[KIVO Web Server] Installers storage path: ${UPLOADS_DIR}`);
  console.log(`[KIVO Web Server] Database data path: ${DATA_DIR}`);
  console.log(`[KIVO Web Server] Attachments storage path: ${ATTACHMENTS_DIR}`);
  logSafeAuthDiagnostics();
  getMysqlPool().catch((err) => {
    console.warn('[KIVO Web Server] MySQL initialization notice:', err.message);
  });
});
