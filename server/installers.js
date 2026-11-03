import fs from 'node:fs';
import path from 'node:path';
import {
  METADATA_FILE,
  PLATFORM_RULES,
} from './config.js';

// Load metadata from disk
export function getMetadata() {
  try {
    if (!fs.existsSync(METADATA_FILE)) {
      return {
        windows: null,
        'mac-arm64': null,
        'mac-intel': null,
      };
    }
    const raw = fs.readFileSync(METADATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    
    // Verify physical file existence
    for (const platform of Object.keys(PLATFORM_RULES)) {
      if (parsed[platform] && parsed[platform].filePath) {
        if (!fs.existsSync(parsed[platform].filePath)) {
          parsed[platform] = null;
        }
      }
    }
    return parsed;
  } catch (err) {
    console.error('[KIVO Storage] Error reading metadata:', err);
    return {
      windows: null,
      'mac-arm64': null,
      'mac-intel': null,
    };
  }
}

// Save metadata atomically to disk
export function saveMetadata(meta) {
  const tempPath = `${METADATA_FILE}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(meta, null, 2), 'utf8');
  fs.renameSync(tempPath, METADATA_FILE);
}

// Get installer details by platform
export function getInstaller(platform) {
  const metadata = getMetadata();
  return metadata[platform] || null;
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

    if (start >= fileSize || end >= fileSize) {
      res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
      return res.end();
    }

    const chunksize = end - start + 1;
    const fileStream = fs.createReadStream(installer.filePath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': rule.mimeType,
      'Content-Disposition': `attachment; filename="${safeFilename}"`,
    });
    fileStream.pipe(res);
  } else {
    // Full stream download
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': rule.mimeType,
      'Content-Disposition': `attachment; filename="${safeFilename}"`,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
    });
    fs.createReadStream(installer.filePath).pipe(res);
  }
}
