import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import cookieParser from 'cookie-parser';

import {
  UPLOADS_DIR,
  MAX_FILE_SIZE,
  PLATFORM_RULES,
  ADMIN_USERNAME,
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const distPath = path.join(__dirname, 'dist');
const indexPath = path.join(distPath, 'index.html');

// Validate dist build exists
if (!fs.existsSync(distPath) || !fs.existsSync(indexPath)) {
  console.warn(
    'WARNING: dist folder or index.html not found! Make sure to run "npm run build" before starting the server.'
  );
}

// Global middlewares
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
// Raw binary body parser for chunk uploads (accepts application/octet-stream up to 20MB)
app.use('/api/admin/upload/chunk', express.raw({ type: 'application/octet-stream', limit: '25mb' }));

// -------------------------------------------------------------
// Public Health & Download Endpoints
// -------------------------------------------------------------

// Health check endpoint for GoDaddy deployment / load balancer monitors
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    app: 'KIVO Browser Official Website',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    uploadsDir: UPLOADS_DIR,
  });
});

// Public status of installers (used dynamically by website download cards)
app.get('/api/downloads/status', (req, res) => {
  try {
    const meta = getMetadata();
    // Return sanitized public info (omit internal file paths)
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
  handleDownloadStream(req, res, platform);
});

// -------------------------------------------------------------
// Authentication Endpoints
// -------------------------------------------------------------

// Admin login endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const result = authenticateAdmin(username, password, clientIp);

  if (!result.success) {
    return res.status(result.status || 401).json({ error: result.error });
  }

  // Set HttpOnly, SameSite cookie for session
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('kivo_admin_session', result.sessionCookie, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
    path: '/',
  });

  // Set readable CSRF cookie so client can include in X-CSRF-Token header
  res.cookie('kivo_csrf_token', result.csrfToken, {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  });

  res.status(200).json({
    success: true,
    user: { username: ADMIN_USERNAME },
    csrfToken: result.csrfToken,
    expiresAt: result.expiresAt,
  });
});

// Admin logout endpoint
app.post('/api/auth/logout', (req, res) => {
  const sessionCookie = req.cookies?.kivo_admin_session;
  invalidateSession(sessionCookie);

  res.clearCookie('kivo_admin_session', { path: '/' });
  res.clearCookie('kivo_csrf_token', { path: '/' });
  res.status(200).json({ success: true, message: 'Logged out successfully.' });
});

// Check current session
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
// Protected Admin API Endpoints
// -------------------------------------------------------------

// List current installers and disk storage information
app.get('/api/admin/installers', requireAdminAuth, (req, res) => {
  try {
    const meta = getMetadata();
    res.status(200).json({
      installers: meta,
      uploadsDir: UPLOADS_DIR,
      maxFileSize: MAX_FILE_SIZE,
      platforms: PLATFORM_RULES,
    });
  } catch (err) {
    console.error('[KIVO API] Error listing installers:', err);
    res.status(500).json({ error: 'Failed to retrieve installer metadata.' });
  }
});

// Step 1: Initialize chunked upload
app.post('/api/admin/upload/init', requireAdminAuth, (req, res) => {
  try {
    const { platform, filename, version, totalSize, totalChunks } = req.body;
    const sessionInfo = initUpload({ platform, filename, version, totalSize, totalChunks });
    res.status(200).json(sessionInfo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Step 2: Receive single chunk
app.post('/api/admin/upload/chunk', requireAdminAuth, (req, res) => {
  try {
    const uploadId = req.query.uploadId || req.headers['x-upload-id'];
    const chunkIndex = req.query.chunkIndex || req.headers['x-chunk-index'];

    if (!uploadId || chunkIndex === undefined) {
      return res.status(400).json({ error: 'uploadId and chunkIndex parameters are required.' });
    }

    const chunkBuffer = req.body;
    const result = writeChunk(uploadId, chunkIndex, chunkBuffer);
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Step 3: Complete chunked upload and assemble file
app.post('/api/admin/upload/complete', requireAdminAuth, async (req, res) => {
  try {
    const { uploadId } = req.body;
    if (!uploadId) {
      return res.status(400).json({ error: 'uploadId parameter is required.' });
    }

    const completedMetadata = await completeUpload(uploadId);
    res.status(200).json({ success: true, metadata: completedMetadata, installer: completedMetadata });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Cancel active upload
app.post('/api/admin/upload/cancel', requireAdminAuth, (req, res) => {
  try {
    const { uploadId } = req.body;
    if (uploadId) cancelUpload(uploadId);
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete installer for platform
app.delete('/api/admin/installers/:platform', requireAdminAuth, (req, res) => {
  try {
    const { platform } = req.params;
    deleteInstaller(platform);
    res.status(200).json({ success: true, message: `Installer for ${platform} deleted.` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Static Asset Serving & SPA Fallback
// -------------------------------------------------------------

// Serve static assets with caching for hashed files
app.use(
  express.static(distPath, {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
      // Aggressive caching for hashed assets in assets/
      if (filePath.includes(path.sep + 'assets' + path.sep)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (filePath.endsWith('.html')) {
        // Never cache HTML so updates are immediate
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    },
  })
);

// SPA fallback: any route (including /kivoadmin) not matching a static file returns index.html
app.use((req, res) => {
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Application build not found. Please run npm run build.');
  }
});

app.listen(PORT, () => {
  console.log(`[KIVO Web Server] Listening on port ${PORT}`);
  console.log(`[KIVO Web Server] Serving static files from: ${distPath}`);
  console.log(`[KIVO Web Server] Installers storage path: ${UPLOADS_DIR}`);
});
