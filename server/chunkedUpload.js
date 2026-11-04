import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {
  UPLOADS_DIR,
  CHUNKS_DIR,
  MAX_FILE_SIZE,
  DEFAULT_CHUNK_SIZE,
  PLATFORM_RULES,
} from './config.js';
import { getMetadata, saveMetadata } from './installers.js';

// Active upload sessions stored in memory: Map<uploadId, UploadSession>
const activeUploads = new Map();

// Periodic cleanup of abandoned chunk folders (older than 2 hours)
setInterval(() => {
  try {
    const now = Date.now();
    for (const [id, session] of activeUploads.entries()) {
      if (now - session.startedAt > 2 * 60 * 60 * 1000) {
        cancelUpload(id);
      }
    }
    // Also clean disk
    if (fs.existsSync(CHUNKS_DIR)) {
      const dirs = fs.readdirSync(CHUNKS_DIR);
      for (const dir of dirs) {
        const full = path.join(CHUNKS_DIR, dir);
        const stat = fs.statSync(full);
        if (now - stat.mtimeMs > 2 * 60 * 60 * 1000) {
          fs.rmSync(full, { recursive: true, force: true });
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
    throw new Error(`Invalid target platform: "${platform}". Must be windows, mac-arm64, or mac-intel.`);
  }

  // Validate size
  const parsedSize = parseInt(totalSize, 10);
  if (isNaN(parsedSize) || parsedSize <= 0) {
    throw new Error('Invalid totalSize parameter.');
  }
  if (parsedSize > MAX_FILE_SIZE) {
    throw new Error(`File size (${(parsedSize / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed limit of 2 GB.`);
  }

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

  // ATOMIC REPLACEMENT: Never delete existing working binary before new binary is verified
  let hasBackup = false;
  try {
    if (fs.existsSync(targetFilePath)) {
      fs.renameSync(targetFilePath, backupFilePath);
      hasBackup = true;
    }
    fs.renameSync(tempTargetFilePath, targetFilePath);

    // Swap successful, safely purge backup
    if (hasBackup && fs.existsSync(backupFilePath)) {
      try {
        fs.unlinkSync(backupFilePath);
      } catch {
        // Non-critical
      }
    }
  } catch (swapErr) {
    // If swap failed and backup exists, restore backup immediately!
    if (hasBackup && fs.existsSync(backupFilePath) && !fs.existsSync(targetFilePath)) {
      try {
        fs.renameSync(backupFilePath, targetFilePath);
      } catch {
        // Ignore
      }
    }
    throw new Error(`Failed to atomically replace installer: ${swapErr.message}`);
  }

  // Update metadata file
  const metadata = getMetadata();
  metadata[session.platform] = {
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
  };
  saveMetadata(metadata);

  // Clean up chunk files and active session
  try {
    fs.rmSync(session.sessionDir, { recursive: true, force: true });
  } catch (err) {
    console.warn('[KIVO Upload] Error cleaning up chunk directory:', err);
  }
  activeUploads.delete(uploadId);

  return metadata[session.platform];
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
