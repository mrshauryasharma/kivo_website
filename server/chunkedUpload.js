import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {
  UPLOADS_DIR,
  ARCHIVE_DIR,
  CHUNKS_DIR,
  MAX_FILE_SIZE,
  DEFAULT_CHUNK_SIZE,
  PLATFORM_RULES,
} from './config.js';
import { getMetadata, saveMetadata } from './installers.js';
import { syncInstallerMetadataToMysql, saveInstallerBinaryToMysql } from './mysql.js';
import { assertStorageAvailable } from './storageMonitor.js';

// Active upload sessions stored in memory: Map<uploadId, UploadSession>
const activeUploads = new Map();

// Periodic cleanup strictly for incomplete/abandoned upload chunks (older than 2 hours).
// NOTE: Completed desktop installer binaries are NEVER deleted by this or any other routine.
// Installer binaries have permanent retention and remain until manually deleted by an administrator.
setInterval(() => {
  try {
    const now = Date.now();
    for (const [id, session] of activeUploads.entries()) {
      if (now - session.startedAt > 2 * 60 * 60 * 1000) {
        cancelUpload(id);
      }
    }

    // Safety guard: Ensure CHUNKS_DIR is strictly separate from UPLOADS_DIR
    if (path.resolve(CHUNKS_DIR) !== path.resolve(UPLOADS_DIR) && fs.existsSync(CHUNKS_DIR)) {
      const dirs = fs.readdirSync(CHUNKS_DIR);
      for (const dir of dirs) {
        const full = path.join(CHUNKS_DIR, dir);
        try {
          const stat = fs.statSync(full);
          if (stat.isDirectory() && now - stat.mtimeMs > 2 * 60 * 60 * 1000) {
            // Verify directory contains temporary chunks only, never binary targets
            const contents = fs.readdirSync(full);
            const isChunkOnlyDir = contents.every((f) => f.endsWith('.part') || f.startsWith('chunk_'));
            if (isChunkOnlyDir) {
              fs.rmSync(full, { recursive: true, force: true });
            }
          }
        } catch {
          // Skip file lock or permission errors
        }
      }
    }
  } catch (err) {
    console.error('[KIVO Upload] Error cleaning old chunks:', err);
  }
}, 30 * 60 * 1000);

// Initialize a new chunked upload session
export function initUpload({ platform, filename, version, totalSize, totalChunks }) {
  const rule = PLATFORM_RULES[platform];
  if (!rule) {
    throw new Error(`Invalid target platform: "${platform}". Must be android, windows, mac-arm64, or mac-intel.`);
  }

  // Validate size
  const parsedSize = parseInt(totalSize, 10);
  if (isNaN(parsedSize) || parsedSize <= 0) {
    throw new Error('Invalid totalSize parameter.');
  }
  if (parsedSize > MAX_FILE_SIZE) {
    throw new Error(`File size (${(parsedSize / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed limit of 2 GB.`);
  }

  // Pre-check GoDaddy 25 GB storage quota and available disk space
  assertStorageAvailable(parsedSize);

  // Validate filename and extension
  const safeFilename = path.basename(filename || rule.defaultFileName);
  const ext = path.extname(safeFilename).toLowerCase();
  if (!rule.allowedExtensions.includes(ext)) {
    throw new Error(
      `Invalid file extension "${ext}" for ${rule.name}. Only ${rule.allowedExtensions.join(', ')} files are permitted.`
    );
  }

  const parsedChunks = parseInt(totalChunks, 10);
  if (isNaN(parsedChunks) || parsedChunks <= 0) {
    throw new Error('Invalid totalChunks parameter.');
  }

  const uploadId = crypto.randomUUID();
  const sessionDir = path.join(CHUNKS_DIR, uploadId);
  fs.mkdirSync(sessionDir, { recursive: true });

  const session = {
    uploadId,
    platform,
    filename: safeFilename,
    version: (version || '1.0.0').trim(),
    totalSize: parsedSize,
    totalChunks: parsedChunks,
    receivedChunks: new Set(),
    startedAt: Date.now(),
    sessionDir,
  };

  activeUploads.set(uploadId, session);

  return {
    success: true,
    uploadId,
    chunkSize: DEFAULT_CHUNK_SIZE,
    platform,
    maxSize: MAX_FILE_SIZE,
  };
}

// Receive and store a single chunk binary
export function writeChunk(uploadId, chunkIndex, buffer) {
  const session = activeUploads.get(uploadId);
  if (!session) {
    throw new Error('Upload session not found or has expired. Please restart the upload.');
  }

  const idx = parseInt(chunkIndex, 10);
  if (isNaN(idx) || idx < 0 || idx >= session.totalChunks) {
    throw new Error(`Invalid chunkIndex ${chunkIndex}. Expected 0 to ${session.totalChunks - 1}.`);
  }

  if (!buffer || buffer.length === 0) {
    throw new Error('Empty chunk payload received.');
  }

  const chunkPath = path.join(session.sessionDir, `chunk_${idx}.part`);
  fs.writeFileSync(chunkPath, buffer);
  session.receivedChunks.add(idx);

  return {
    success: true,
    chunkIndex: idx,
    receivedCount: session.receivedChunks.size,
    totalChunks: session.totalChunks,
  };
}

// Complete the chunked upload, assemble chunks, compute checksum, and save to persistent storage with atomic replacement
export async function completeUpload(uploadId) {
  const session = activeUploads.get(uploadId);
  if (!session) {
    throw new Error('Upload session not found or has expired.');
  }

  // Verify all chunks have been received
  for (let i = 0; i < session.totalChunks; i++) {
    const chunkPath = path.join(session.sessionDir, `chunk_${i}.part`);
    if (!fs.existsSync(chunkPath)) {
      throw new Error(`Missing chunk index ${i} of ${session.totalChunks}. Upload incomplete.`);
    }
  }

  const rule = PLATFORM_RULES[session.platform];
  const targetExt = path.extname(session.filename);
  const targetFilename = `${session.platform}${targetExt}`;
  const targetFilePath = path.join(UPLOADS_DIR, targetFilename);
  const tempTargetFilePath = path.join(UPLOADS_DIR, `${targetFilename}.assembling.${Date.now()}`);
  const backupFilePath = path.join(UPLOADS_DIR, `${targetFilename}.backup.${Date.now()}`);

  // Concatenate chunks using streams to prevent high memory usage
  const writeStream = fs.createWriteStream(tempTargetFilePath);
  const hash = crypto.createHash('sha256');
  let assembledBytes = 0;

  for (let i = 0; i < session.totalChunks; i++) {
    const chunkPath = path.join(session.sessionDir, `chunk_${i}.part`);
    const chunkData = fs.readFileSync(chunkPath);
    hash.update(chunkData);
    assembledBytes += chunkData.length;
    writeStream.write(chunkData);
  }

  await new Promise((resolve, reject) => {
    writeStream.end((err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Verify total assembled size matches expected
  if (assembledBytes !== session.totalSize) {
    if (fs.existsSync(tempTargetFilePath)) fs.unlinkSync(tempTargetFilePath);
    throw new Error(
      `File size mismatch during assembly. Expected ${session.totalSize} bytes, assembled ${assembledBytes} bytes. Existing binary remains unchanged.`
    );
  }

  // Verify file readability
  try {
    fs.accessSync(tempTargetFilePath, fs.constants.R_OK);
  } catch (err) {
    if (fs.existsSync(tempTargetFilePath)) fs.unlinkSync(tempTargetFilePath);
    throw new Error(`Assembled file is not readable: ${err.message}. Existing binary remains unchanged.`);
  }

  const sha256 = hash.digest('hex');

  // ATOMIC REPLACEMENT & VERSION ARCHIVING:
  // Existing binaries are archived in ARCHIVE_DIR for rollback safety. Never auto-deleted.
  const currentMeta = getMetadata()[session.platform];
  let archivedOldPath = null;
  let hasOld = false;

  try {
    if (!fs.existsSync(ARCHIVE_DIR)) {
      fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    }

    if (fs.existsSync(targetFilePath)) {
      const oldVersion = currentMeta?.version || 'prev';
      archivedOldPath = path.join(ARCHIVE_DIR, `${session.platform}-v${oldVersion}-${Date.now()}${targetExt}`);
      fs.copyFileSync(targetFilePath, archivedOldPath);
      fs.renameSync(targetFilePath, backupFilePath);
      hasOld = true;
    }

    fs.renameSync(tempTargetFilePath, targetFilePath);

    // POST-WRITE READBACK VERIFICATION
    const verifyBuf = fs.readFileSync(targetFilePath);
    const verifyHash = crypto.createHash('sha256').update(verifyBuf).digest('hex');
    if (verifyHash !== sha256) {
      throw new Error(`Integrity verification failed on disk readback. Computed: ${sha256}, Read: ${verifyHash}`);
    }

    // Clean up temporary backup since target is verified (permanent archive copy is retained in ARCHIVE_DIR)
    if (hasOld && fs.existsSync(backupFilePath)) {
      try {
        fs.unlinkSync(backupFilePath);
      } catch {}
    }
  } catch (swapErr) {
    // If swap or verification failed, restore backup immediately
    if (hasOld && fs.existsSync(backupFilePath) && !fs.existsSync(targetFilePath)) {
      try {
        fs.renameSync(backupFilePath, targetFilePath);
      } catch {}
    }
    throw new Error(`Failed to atomically install verified binary: ${swapErr.message}`);
  }

  // Update metadata with permanent retention guarantees and UUID
  const installerId = crypto.randomUUID();
  const metadata = getMetadata();
  const installerRecord = {
    id: installerId,
    platform: session.platform,
    name: rule.name,
    architecture: rule.architecture,
    filename: session.filename,
    version: session.version,
    size: session.totalSize,
    sha256: sha256,
    filePath: targetFilePath,
    uploadedAt: new Date().toISOString(),
    downloadUrl: `/api/download/${session.platform}`,
    retention: 'permanent',
    retentionPolicy: 'indefinite_until_manual_removal',
    autoDelete: false,
    isActive: true,
    isDeleted: false,
    status: 'verified',
    archivedPreviousVersion: archivedOldPath || null,
  };

  metadata[session.platform] = installerRecord;
  saveMetadata(metadata);

  // Sync to MySQL Layer B with audit log
  await syncInstallerMetadataToMysql(metadata, 'UPLOAD', 'admin');

  // PERMANENT DUAL-LAYER STORAGE: Store complete binary into MySQL chunks
  // This guarantees binaries survive container sleep, shutdown, and fresh deployments!
  try {
    const dbSaveRes = await saveInstallerBinaryToMysql(session.platform, session.version, targetFilePath);
    if (dbSaveRes?.success) {
      installerRecord.hasDbBinary = true;
      metadata[session.platform].hasDbBinary = true;
      saveMetadata(metadata);
      console.log(`[KIVO Upload] Successfully persisted ${session.platform} binary into MySQL database!`);
    }
  } catch (dbErr) {
    console.warn(`[KIVO Upload] Notice: Binary storage in MySQL skipped:`, dbErr.message);
  }

  // Clean up chunk files and active session
  try {
    fs.rmSync(session.sessionDir, { recursive: true, force: true });
  } catch (err) {
    console.warn('[KIVO Upload] Error cleaning up chunk directory:', err);
  }
  activeUploads.delete(uploadId);

  return installerRecord;
}

// Cancel and delete an in-progress upload
export function cancelUpload(uploadId) {
  const session = activeUploads.get(uploadId);
  if (session) {
    try {
      fs.rmSync(session.sessionDir, { recursive: true, force: true });
    } catch (err) {
      console.warn('[KIVO Upload] Error deleting chunk directory:', err);
    }
    activeUploads.delete(uploadId);
  }
  return true;
}
