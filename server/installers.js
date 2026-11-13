import fs from 'node:fs';
import path from 'node:path';
import {
  PLATFORM_RULES,
  UPLOADS_DIR,
  ARCHIVE_DIR,
  resolveInstallerFilePath,
  INSTALLER_RETENTION_POLICY,
} from './config.js';
import {
  getStoredMetadata,
  saveStoredMetadata,
} from './db.js';
import {
  deleteInstallerMetadataFromMysql,
  incrementDownloadCountInMysql,
  checkInstallerBinaryInMysql,
  restoreInstallerBinaryFromMysql,
  streamInstallerBinaryFromMysql,
  deleteInstallerBinaryFromMysql,
} from './mysql.js';

// Load metadata from persistent database
export function getMetadata() {
  return getStoredMetadata();
}

// Save metadata atomically to disk (guaranteeing permanent retention metadata)
export function saveMetadata(meta) {
  saveStoredMetadata(meta);
}

// Get installer details by platform with multi-location persistent path resolution
export function getInstaller(platform) {
  const metadata = getMetadata();
  const installer = metadata[platform];
  if (!installer) return null;

  // 1. Direct path check
  if (installer.filePath && fs.existsSync(installer.filePath)) {
    return installer;
  }

  // 2. Multi-directory persistent candidate resolution
  const resolvedPath = resolveInstallerFilePath(platform, installer.filename, installer.filePath);
  if (resolvedPath && fs.existsSync(resolvedPath)) {
    installer.filePath = resolvedPath;
    saveMetadata(metadata);
    return installer;
  }

  return null;
}

// Async installer lookup with MySQL binary auto-restore
export async function getInstallerAsync(platform) {
  const metadata = getMetadata();
  let installer = metadata[platform];

  // 1. Direct path check
  if (installer && installer.filePath && fs.existsSync(installer.filePath)) {
    return installer;
  }

  // 2. Multi-directory persistent candidate resolution
  if (installer) {
    const resolvedPath = resolveInstallerFilePath(platform, installer.filename, installer.filePath);
    if (resolvedPath && fs.existsSync(resolvedPath)) {
      installer.filePath = resolvedPath;
      saveMetadata(metadata);
      return installer;
    }
  }

  // 3. MySQL binary chunk check & auto-restore
  try {
    const dbBinary = await checkInstallerBinaryInMysql(platform);
    if (dbBinary && dbBinary.exists && dbBinary.chunkCount > 0) {
      const rule = PLATFORM_RULES[platform];
      const filename = installer?.filename || rule?.defaultFileName || `${platform}.bin`;
      const targetRestorePath = resolveInstallerFilePath(platform, filename);
      const restored = await restoreInstallerBinaryFromMysql(platform, targetRestorePath);
      if (restored && restored.success && fs.existsSync(targetRestorePath)) {
        if (!installer) {
          installer = {
            id: crypto.randomUUID(),
            platform,
            name: rule?.name || platform,
            architecture: rule?.architecture || 'x64',
            filename,
            version: dbBinary.version || '1.0.0',
            size: restored.size,
            sha256: restored.sha256,
            filePath: targetRestorePath,
            downloadUrl: `/api/download/${platform}`,
            uploadedAt: new Date().toISOString(),
            retention: 'permanent',
            retentionPolicy: 'indefinite_until_manual_removal',
            autoDelete: false,
            isActive: true,
            isDeleted: false,
            status: 'verified',
            available: true,
            hasDbBinary: true,
          };
          metadata[platform] = installer;
        } else {
          installer.filePath = targetRestorePath;
          installer.status = 'verified';
          installer.available = true;
          installer.hasDbBinary = true;
        }
        saveMetadata(metadata);
        return installer;
      }
      if (installer) {
        installer.hasDbBinary = true;
        return installer;
      }
    }
  } catch (err) {
    console.warn(`[KIVO Storage] getInstallerAsync DB restore notice for ${platform}:`, err.message);
  }

  return installer || null;
}

// Delete installer for platform (MANUAL ADMIN REMOVAL ONLY)
// Note: Desktop installer binaries are permanently retained on disk.
// There is zero automatic deletion, TTL, cron, or timer on completed installers.
// Manual removal through this function by an authorized administrator is the ONLY deletion mechanism.
export async function deleteInstaller(platform, adminUser = 'admin') {
  if (!PLATFORM_RULES[platform]) {
    throw new Error(`Invalid platform: ${platform}`);
  }

  const metadata = getMetadata();
  const current = metadata[platform];

  if (current && current.filePath && fs.existsSync(current.filePath)) {
    try {
      // Archive before removal as an audit safety measure
      if (!fs.existsSync(ARCHIVE_DIR)) {
        fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
      }
      const ext = path.extname(current.filePath);
      const archivedCopy = path.join(ARCHIVE_DIR, `${platform}-deleted-${Date.now()}${ext}`);
      try {
        fs.copyFileSync(current.filePath, archivedCopy);
      } catch {}

      fs.unlinkSync(current.filePath);
    } catch (err) {
      console.warn(`[KIVO Storage] Failed to delete file ${current.filePath}:`, err);
    }
  }

  // Clean any candidate duplicate binary for this platform to ensure complete manual removal
  const candidatePath = resolveInstallerFilePath(platform, current?.filename);
  if (candidatePath && fs.existsSync(candidatePath)) {
    try {
      fs.unlinkSync(candidatePath);
    } catch {
      // Non-critical
    }
  }

  metadata[platform] = null;
  saveMetadata(metadata);
  await deleteInstallerMetadataFromMysql(platform, adminUser);
  await deleteInstallerBinaryFromMysql(platform);
  return true;
}

// Stream download handler with Range support for high-speed download managers
export async function handleDownloadStream(req, res, platform) {
  const rule = PLATFORM_RULES[platform];
  if (!rule) {
    return res.status(404).send('Invalid platform specified.');
  }

  let installer = getInstaller(platform);
  let fileOnDisk = Boolean(installer && installer.filePath && fs.existsSync(installer.filePath));

  if (!fileOnDisk) {
    // Attempt async resolution & restore from MySQL
    installer = await getInstallerAsync(platform);
    fileOnDisk = Boolean(installer && installer.filePath && fs.existsSync(installer.filePath));
  }

  // If still not on disk, check if MySQL has the binary chunks and stream directly
  if (!fileOnDisk) {
    const rawFilename = installer?.filename || rule.defaultFileName;
    const safeFilename = path.basename(rawFilename).replace(/["\r\n\t]/g, '_');
    const streamed = await streamInstallerBinaryFromMysql(res, platform, rule.mimeType, safeFilename);
    if (streamed) {
      incrementDownloadCountInMysql(platform).catch(() => {});
      // Trigger background restore to disk cache for subsequent downloads
      const targetPath = resolveInstallerFilePath(platform, safeFilename);
      restoreInstallerBinaryFromMysql(platform, targetPath).catch(() => {});
      return;
    }
    return res.status(404).send('Installer binary is currently unavailable for this platform.');
  }

  // Record download count in MySQL
  incrementDownloadCountInMysql(platform).catch(() => {});

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
