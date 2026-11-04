import fs from 'node:fs';
import path from 'node:path';
import {
  PLATFORM_RULES,
  UPLOADS_DIR,
} from './config.js';
import {
  getStoredMetadata,
  saveStoredMetadata,
} from './db.js';

// Load metadata from persistent database
export function getMetadata() {
  return getStoredMetadata();
}

// Save metadata atomically to disk
export function saveMetadata(meta) {
  saveStoredMetadata(meta);
}

// Get installer details by platform with path resolution fallback
export function getInstaller(platform) {
  const metadata = getMetadata();
  const installer = metadata[platform];
  if (!installer) return null;

  // Verify file path or attempt resolution in persistent UPLOADS_DIR
  if (installer.filePath && fs.existsSync(installer.filePath)) {
    return installer;
  }

  // Fallback: check persistent UPLOADS_DIR with target or original filename
  const ext = path.extname(installer.filename || '');
  const candidateNames = [
    `${platform}${ext}`,
    installer.filename,
    PLATFORM_RULES[platform]?.defaultFileName,
  ].filter(Boolean);

  for (const name of candidateNames) {
    const candidatePath = path.join(UPLOADS_DIR, name);
    if (fs.existsSync(candidatePath)) {
      installer.filePath = candidatePath;
      saveMetadata(metadata);
      return installer;
    }
  }

  return null;
}

// Delete installer for platform
export function deleteInstaller(platform) {
  if (!PLATFORM_RULES[platform]) {
    throw new Error(`Invalid platform: ${platform}`);
  }

  const metadata = getMetadata();
  const current = metadata[platform];

  if (current && current.filePath && fs.existsSync(current.filePath)) {
    try {
      fs.unlinkSync(current.filePath);
    } catch (err) {
      console.warn(`[KIVO Storage] Failed to delete file ${current.filePath}:`, err);
    }
  }

  metadata[platform] = null;
  saveMetadata(metadata);
  return true;
}

// Stream download handler with Range support for high-speed download managers
export function handleDownloadStream(req, res, platform) {
  const rule = PLATFORM_RULES[platform];
  if (!rule) {
    return res.status(404).send('Invalid platform specified.');
  }

  const installer = getInstaller(platform);
  if (!installer || !installer.filePath || !fs.existsSync(installer.filePath)) {
    return res.status(404).send('Installer binary is currently unavailable for this platform.');
  }

  const stat = fs.statSync(installer.filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  const rawFilename = installer.filename || rule.defaultFileName;
  const safeFilename = path.basename(rawFilename).replace(/["\r\n\t]/g, '_');

  if (range) {
    // Range request: e.g. "bytes=0-1024"
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize || start > end) {
      res.setHeader('Content-Range', `bytes */${fileSize}`);
      return res.status(416).send('Requested range not satisfiable');
    }

    const chunksize = end - start + 1;
    const file = fs.createReadStream(installer.filePath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': rule.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${safeFilename}"`,
      'Cache-Control': 'no-cache',
    });

    file.pipe(res);
  } else {
    // Full binary streaming
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': rule.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${safeFilename}"`,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
    });

    const file = fs.createReadStream(installer.filePath);
    file.pipe(res);
  }
}
