import fs from 'node:fs';
import path from 'node:path';
import {
  UPLOADS_DIR,
  ATTACHMENTS_DIR,
  DATA_DIR,
  GODADDY_MAX_STORAGE_BYTES,
  SAFE_STORAGE_CAP_BYTES,
  MIN_FREE_DISK_BYTES,
} from './config.js';

// Helper to calculate recursive directory size in bytes
function getDirectorySizeBytes(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) return 0;
    let total = 0;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        total += getDirectorySizeBytes(fullPath);
      } else if (entry.isFile()) {
        try {
          const stat = fs.statSync(fullPath);
          total += stat.size;
        } catch {
          // Skip unreadable files
        }
      }
    }
    return total;
  } catch {
    return 0;
  }
}

// Get comprehensive storage metrics for GoDaddy hosting
export function getStorageMetrics() {
  let totalDiskBytes = GODADDY_MAX_STORAGE_BYTES;
  let freeDiskBytes = GODADDY_MAX_STORAGE_BYTES;
  let usedDiskBytes = 0;

  try {
    // Query physical filesystem stats using native Node.js statfs
    const targetDir = fs.existsSync(UPLOADS_DIR) ? UPLOADS_DIR : '.';
    const stats = fs.statfsSync(targetDir);
    const bsize = stats.bsize || 4096;
    const osTotal = stats.blocks * bsize;
    const osFree = stats.bavail * bsize;

    // Use minimum of OS-reported or GoDaddy 25GB quota
    totalDiskBytes = Math.min(osTotal, GODADDY_MAX_STORAGE_BYTES);
    freeDiskBytes = Math.min(osFree, totalDiskBytes);
    usedDiskBytes = totalDiskBytes - freeDiskBytes;
  } catch (err) {
    console.warn('[KIVO Storage Monitor] statfs check warning:', err.message);
  }

  // Calculate actual KIVO storage usage per category
  const installersBytes = getDirectorySizeBytes(UPLOADS_DIR);
  const attachmentsBytes = getDirectorySizeBytes(ATTACHMENTS_DIR);
  const dataBytes = getDirectorySizeBytes(DATA_DIR);
  const totalKivoBytes = installersBytes + attachmentsBytes + dataBytes;

  const isLowSpace = freeDiskBytes < MIN_FREE_DISK_BYTES;
  const isQuotaExceeded = totalKivoBytes >= SAFE_STORAGE_CAP_BYTES || isLowSpace;

  return {
    quotaLimitBytes: GODADDY_MAX_STORAGE_BYTES,
    safeCapBytes: SAFE_STORAGE_CAP_BYTES,
    totalDiskBytes,
    freeDiskBytes,
    usedDiskBytes,
    totalKivoBytes,
    categories: {
      installers: installersBytes,
      attachments: attachmentsBytes,
      data: dataBytes,
    },
    percentUsed: Math.min(100, Number(((totalKivoBytes / GODADDY_MAX_STORAGE_BYTES) * 100).toFixed(2))),
    isLowSpace,
    isQuotaExceeded,
  };
}

// Pre-upload validation guard to prevent exceeding available hosting storage
export function assertStorageAvailable(incomingBytes = 0) {
  const metrics = getStorageMetrics();

  if (metrics.freeDiskBytes < incomingBytes + MIN_FREE_DISK_BYTES) {
    const error = new Error('Server storage quota limit reached. Insufficient disk space.');
    error.statusCode = 507; // Insufficient Storage
    error.code = 'STORAGE_QUOTA_EXCEEDED';
    throw error;
  }

  if (metrics.totalKivoBytes + incomingBytes > SAFE_STORAGE_CAP_BYTES) {
    const error = new Error('Hosting storage capacity cap reached. Please delete old files.');
    error.statusCode = 507;
    error.code = 'STORAGE_CAP_REACHED';
    throw error;
  }

  return true;
}
