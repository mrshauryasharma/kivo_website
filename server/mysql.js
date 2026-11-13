import mysql from 'mysql2/promise';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getMysqlConfig } from './config.js';

let pool = null;
let isInitialized = false;

// Initialize MySQL Connection Pool
export async function getMysqlPool() {
  if (pool) return pool;

  const config = getMysqlConfig();
  if (!config.isConfigured) {
    return null;
  }

  try {
    pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: config.waitForConnections,
      connectionLimit: config.connectionLimit,
      queueLimit: config.queueLimit,
      connectTimeout: config.connectTimeout,
      charset: 'utf8mb4',
    });

    // Test connection
    const connection = await pool.getConnection();
    connection.release();
    console.log(`[KIVO MySQL] Successfully connected to MySQL database: ${config.database}@${config.host}`);

    if (!isInitialized) {
      await createTablesIfNotExist();
      isInitialized = true;
    }

    return pool;
  } catch (err) {
    console.warn(`[KIVO MySQL] Connection failed: ${err.message}. Falling back to persistent file storage.`);
    pool = null;
    return null;
  }
}

// Create and verify all required database tables
export async function createTablesIfNotExist() {
  if (!pool) return;

  const ddlStatements = [
    // 1. Installers Metadata (Permanent Dual-Layer Architecture)
    `CREATE TABLE IF NOT EXISTS kivo_installers_metadata (
      platform VARCHAR(32) PRIMARY KEY,
      id VARCHAR(64) DEFAULT NULL,
      name VARCHAR(128) NOT NULL,
      architecture VARCHAR(64) NOT NULL,
      filename VARCHAR(255) NOT NULL,
      version VARCHAR(32) NOT NULL,
      size_bytes BIGINT NOT NULL,
      sha256 VARCHAR(64) NOT NULL,
      file_path VARCHAR(512) NOT NULL,
      download_url VARCHAR(255) NOT NULL,
      uploaded_at DATETIME NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      is_deleted TINYINT(1) NOT NULL DEFAULT 0,
      retention VARCHAR(32) NOT NULL DEFAULT 'permanent',
      download_count INT NOT NULL DEFAULT 0,
      release_notes TEXT DEFAULT NULL,
      audit_log LONGTEXT DEFAULT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_active_del (is_active, is_deleted)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    // 1b. Installers History & Audit Trail (Strict No-Auto-Delete and Version Archiving)
    `CREATE TABLE IF NOT EXISTS kivo_installers_history (
      id VARCHAR(64) PRIMARY KEY,
      installer_id VARCHAR(64),
      platform VARCHAR(32) NOT NULL,
      version VARCHAR(32) NOT NULL,
      filename VARCHAR(255) NOT NULL,
      size_bytes BIGINT NOT NULL,
      sha256 VARCHAR(64) NOT NULL,
      file_path VARCHAR(512) NOT NULL,
      action VARCHAR(32) NOT NULL,
      admin_user VARCHAR(128) DEFAULT 'admin',
      details LONGTEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_hist_platform (platform),
      INDEX idx_hist_action (action)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    // 1c. Permanent Binary Chunk Storage in MySQL (Survives Container Restarts & Ephemeral Disk Wipe)
    `CREATE TABLE IF NOT EXISTS kivo_installer_binary_chunks (
      id VARCHAR(64) PRIMARY KEY,
      platform VARCHAR(32) NOT NULL,
      version VARCHAR(32) NOT NULL,
      chunk_index INT NOT NULL,
      chunk_size INT NOT NULL,
      chunk_data MEDIUMBLOB NOT NULL,
      sha256 VARCHAR(64) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_plat_chunk (platform, chunk_index),
      INDEX idx_plat_ver (platform, version)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    // 2. CMS Content
    `CREATE TABLE IF NOT EXISTS kivo_cms_content (
      section_key VARCHAR(64) PRIMARY KEY,
      draft_json LONGTEXT,
      published_json LONGTEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    // 3. CMS Revision History
    `CREATE TABLE IF NOT EXISTS kivo_cms_history (
      id VARCHAR(64) PRIMARY KEY,
      section_key VARCHAR(64) NOT NULL,
      content_json LONGTEXT NOT NULL,
      author VARCHAR(128) NOT NULL,
      action_type VARCHAR(32) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    // 4. Support Tickets
    `CREATE TABLE IF NOT EXISTS kivo_support_tickets (
      id VARCHAR(32) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(64) NOT NULL,
      category VARCHAR(64) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      description LONGTEXT,
      status VARCHAR(32) NOT NULL DEFAULT 'Open',
      priority VARCHAR(32) NOT NULL DEFAULT 'Normal',
      assignee VARCHAR(128) DEFAULT 'Unassigned',
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      last_response_at DATETIME,
      INDEX idx_status (status),
      INDEX idx_email (email),
      INDEX idx_priority (priority)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    // 5. Ticket Messages
    `CREATE TABLE IF NOT EXISTS kivo_ticket_messages (
      id VARCHAR(64) PRIMARY KEY,
      ticket_id VARCHAR(32) NOT NULL,
      sender VARCHAR(255) NOT NULL,
      sender_type VARCHAR(16) NOT NULL,
      message_text LONGTEXT NOT NULL,
      email_status VARCHAR(32) DEFAULT 'pending',
      created_at DATETIME NOT NULL,
      INDEX idx_ticket (ticket_id),
      FOREIGN KEY (ticket_id) REFERENCES kivo_support_tickets(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    // 6. Ticket Attachments
    `CREATE TABLE IF NOT EXISTS kivo_ticket_attachments (
      id VARCHAR(64) PRIMARY KEY,
      ticket_id VARCHAR(32) NOT NULL,
      message_id VARCHAR(64),
      filename VARCHAR(255) NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      mime_type VARCHAR(128) NOT NULL,
      size_bytes BIGINT NOT NULL,
      file_path VARCHAR(512),
      created_at DATETIME NOT NULL,
      INDEX idx_ticket_att (ticket_id),
      FOREIGN KEY (ticket_id) REFERENCES kivo_support_tickets(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    // 7. Status History
    `CREATE TABLE IF NOT EXISTS kivo_ticket_status_history (
      id VARCHAR(64) PRIMARY KEY,
      ticket_id VARCHAR(32) NOT NULL,
      from_status VARCHAR(32),
      to_status VARCHAR(32) NOT NULL,
      changed_by VARCHAR(128) NOT NULL,
      reason TEXT,
      created_at DATETIME NOT NULL,
      INDEX idx_ticket_stat (ticket_id),
      FOREIGN KEY (ticket_id) REFERENCES kivo_support_tickets(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    // 8. Internal Staff Notes
    `CREATE TABLE IF NOT EXISTS kivo_ticket_internal_notes (
      id VARCHAR(64) PRIMARY KEY,
      ticket_id VARCHAR(32) NOT NULL,
      author VARCHAR(128) NOT NULL,
      note_text LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL,
      INDEX idx_ticket_notes (ticket_id),
      FOREIGN KEY (ticket_id) REFERENCES kivo_support_tickets(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    // 9. Verification Tokens (OTP & Magic Links)
    `CREATE TABLE IF NOT EXISTS kivo_ticket_verification_tokens (
      id VARCHAR(64) PRIMARY KEY,
      ticket_id VARCHAR(32) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(64),
      otp_code VARCHAR(16) NOT NULL,
      magic_token VARCHAR(128) NOT NULL,
      used BOOLEAN NOT NULL DEFAULT FALSE,
      expires_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL,
      INDEX idx_ticket_token (ticket_id),
      FOREIGN KEY (ticket_id) REFERENCES kivo_support_tickets(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    // 10. Email Notification Logs
    `CREATE TABLE IF NOT EXISTS kivo_ticket_email_logs (
      id VARCHAR(64) PRIMARY KEY,
      ticket_id VARCHAR(32) NOT NULL,
      email_type VARCHAR(64) NOT NULL,
      recipient VARCHAR(255) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      status VARCHAR(32) NOT NULL,
      resend_id VARCHAR(128),
      error_message TEXT,
      created_at DATETIME NOT NULL,
      INDEX idx_ticket_email (ticket_id),
      FOREIGN KEY (ticket_id) REFERENCES kivo_support_tickets(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    // 11. Customer Users & Authentication
    `CREATE TABLE IF NOT EXISTS kivo_users (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(128) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      role VARCHAR(32) NOT NULL DEFAULT 'customer',
      download_count INT NOT NULL DEFAULT 0,
      reset_token VARCHAR(128),
      reset_token_expires_at BIGINT,
      created_at DATETIME NOT NULL,
      last_login_at DATETIME NOT NULL,
      INDEX idx_user_email (email),
      INDEX idx_user_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    // 12. KIVO Update Center & Releases
    `CREATE TABLE IF NOT EXISTS kivo_release_notes (
      version VARCHAR(32) PRIMARY KEY,
      release_date DATE NOT NULL,
      is_latest BOOLEAN NOT NULL DEFAULT FALSE,
      whats_new_json LONGTEXT,
      bug_fixes_json LONGTEXT,
      security_improvements_json LONGTEXT,
      system_requirements_json LONGTEXT,
      downloads_json LONGTEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
  ];

  try {
    for (const sql of ddlStatements) {
      await pool.query(sql);
    }

    // Safely check and add any missing columns in kivo_installers_metadata without altering existing data
    try {
      const [existingCols] = await pool.query('SHOW COLUMNS FROM kivo_installers_metadata');
      const colNames = new Set(existingCols.map((c) => c.Field.toLowerCase()));

      const columnDefs = [
        { name: 'id', def: 'VARCHAR(64) DEFAULT NULL' },
        { name: 'release_notes', def: 'TEXT DEFAULT NULL' },
        { name: 'is_active', def: 'TINYINT(1) NOT NULL DEFAULT 1' },
        { name: 'is_deleted', def: 'TINYINT(1) NOT NULL DEFAULT 0' },
        { name: 'retention', def: "VARCHAR(32) NOT NULL DEFAULT 'permanent'" },
        { name: 'download_count', def: 'INT NOT NULL DEFAULT 0' },
        { name: 'audit_log', def: 'LONGTEXT DEFAULT NULL' },
        { name: 'has_db_binary', def: 'TINYINT(1) NOT NULL DEFAULT 0' },
        { name: 'binary_total_chunks', def: 'INT NOT NULL DEFAULT 0' },
        { name: 'binary_chunk_size', def: 'INT NOT NULL DEFAULT 2097152' },
      ];

      for (const col of columnDefs) {
        if (!colNames.has(col.name.toLowerCase())) {
          await pool.query(`ALTER TABLE kivo_installers_metadata ADD COLUMN ${col.name} ${col.def}`);
          console.log(`[KIVO MySQL] Added missing column ${col.name} to kivo_installers_metadata`);
        }
      }
    } catch (colErr) {
      console.warn('[KIVO MySQL] Column migration check notice:', colErr.message);
    }

    console.log('[KIVO MySQL] All database tables verified and ready.');
  } catch (err) {
    console.error('[KIVO MySQL] DDL Error:', err.message);
  }
}

// Health and diagnostics
export async function checkMysqlHealth() {
  const config = getMysqlConfig();
  if (!config.isConfigured) {
    return {
      connected: false,
      configured: false,
      message: 'MySQL is not configured. Using persistent JSON storage.',
    };
  }

  try {
    const currentPool = await getMysqlPool();
    if (!currentPool) {
      return {
        connected: false,
        configured: true,
        message: 'MySQL is configured but connection could not be established.',
      };
    }

    const [rows] = await currentPool.query('SELECT 1 as isAlive, NOW() as serverTime');
    return {
      connected: true,
      configured: true,
      host: config.host,
      database: config.database,
      serverTime: rows[0]?.serverTime,
      message: 'MySQL database connected and operational.',
    };
  } catch (err) {
    return {
      connected: false,
      configured: true,
      error: err.message,
      message: `MySQL connection error: ${err.message}`,
    };
  }
}

// -------------------------------------------------------------
// Installer Metadata MySQL Synchronization Helpers (Dual-Layer Layer B)
// -------------------------------------------------------------
export async function syncInstallerMetadataToMysql(meta, auditAction = 'SYNC', adminUser = 'system') {
  try {
    const currentPool = await getMysqlPool();
    if (!currentPool || !meta || typeof meta !== 'object') return;

    for (const [platform, item] of Object.entries(meta)) {
      if (!item || typeof item !== 'object') continue;

      const installerId = item.id || crypto.randomUUID();
      const isActive = item.isDeleted ? 0 : 1;
      const isDeleted = item.isDeleted ? 1 : 0;
      const retention = item.retention || 'permanent';

      await currentPool.query(
        `INSERT INTO kivo_installers_metadata 
          (platform, id, name, architecture, filename, version, size_bytes, sha256, file_path, download_url, uploaded_at, is_active, is_deleted, retention, release_notes, audit_log)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
          id = COALESCE(kivo_installers_metadata.id, VALUES(id)),
          name = VALUES(name), architecture = VALUES(architecture), filename = VALUES(filename),
          version = VALUES(version), size_bytes = VALUES(size_bytes), sha256 = VALUES(sha256),
          file_path = VALUES(file_path), download_url = VALUES(download_url), uploaded_at = VALUES(uploaded_at),
          is_active = VALUES(is_active), is_deleted = VALUES(is_deleted), retention = VALUES(retention),
          release_notes = VALUES(release_notes), audit_log = VALUES(audit_log)`,
        [
          platform,
          installerId,
          item.name || platform,
          item.architecture || 'Universal',
          item.filename || 'installer',
          item.version || '1.0.0',
          item.size || 0,
          item.sha256 || '',
          item.filePath || '',
          item.downloadUrl || `/api/download/${platform}`,
          new Date(item.uploadedAt || Date.now()),
          isActive,
          isDeleted,
          retention,
          item.releaseNotes || null,
          JSON.stringify(item.auditLog || [{ action: auditAction, user: adminUser, timestamp: new Date().toISOString() }]),
        ]
      );

      // Append to audit history table
      try {
        await currentPool.query(
          `INSERT INTO kivo_installers_history 
            (id, installer_id, platform, version, filename, size_bytes, sha256, file_path, action, admin_user, details)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            crypto.randomUUID(),
            installerId,
            platform,
            item.version || '1.0.0',
            item.filename || 'installer',
            item.size || 0,
            item.sha256 || '',
            item.filePath || '',
            auditAction,
            adminUser,
            JSON.stringify({ retention, uploadedAt: item.uploadedAt, manualAdminAction: adminUser !== 'system' }),
          ]
        );
      } catch (histErr) {
        // Non-critical audit history insert
      }
    }
  } catch (err) {
    console.warn('[KIVO MySQL] Error syncing installer metadata:', err.message);
  }
}

export async function loadInstallerMetadataFromMysql() {
  try {
    const currentPool = await getMysqlPool();
    if (!currentPool) return null;

    const [rows] = await currentPool.query(
      'SELECT * FROM kivo_installers_metadata WHERE is_deleted = 0'
    );
    if (!rows || rows.length === 0) return null;

    const result = {};
    for (const row of rows) {
      result[row.platform] = {
        id: row.id,
        platform: row.platform,
        name: row.name,
        architecture: row.architecture,
        filename: row.filename,
        version: row.version,
        size: Number(row.size_bytes),
        sha256: row.sha256,
        filePath: row.file_path,
        downloadUrl: row.download_url,
        downloadCount: Number(row.download_count || 0),
        uploadedAt: new Date(row.uploaded_at).toISOString(),
        isActive: Boolean(row.is_active),
        isDeleted: Boolean(row.is_deleted),
        retention: row.retention || 'permanent',
        retentionPolicy: 'indefinite_until_manual_removal',
        autoDelete: false,
        releaseNotes: row.release_notes || null,
      };
    }
    return result;
  } catch (err) {
    console.warn('[KIVO MySQL] Error loading installer metadata from MySQL:', err.message);
    return null;
  }
}

export async function deleteInstallerMetadataFromMysql(platform, adminUser = 'admin') {
  try {
    const currentPool = await getMysqlPool();
    if (!currentPool) return;

    // Fetch existing row for audit log before soft-deleting
    const [rows] = await currentPool.query('SELECT * FROM kivo_installers_metadata WHERE platform = ?', [platform]);
    const existing = rows[0];

    // Soft delete: keep record with is_deleted = 1, is_active = 0
    await currentPool.query(
      'UPDATE kivo_installers_metadata SET is_deleted = 1, is_active = 0 WHERE platform = ?',
      [platform]
    );

    // Record audit history
    if (existing) {
      await currentPool.query(
        `INSERT INTO kivo_installers_history 
          (id, installer_id, platform, version, filename, size_bytes, sha256, file_path, action, admin_user, details)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          existing.id,
          platform,
          existing.version,
          existing.filename,
          Number(existing.size_bytes),
          existing.sha256,
          existing.file_path,
          'MANUAL_DELETE',
          adminUser,
          JSON.stringify({ manualAdminDeletion: true, timestamp: new Date().toISOString() }),
        ]
      );
    }
  } catch (err) {
    console.warn('[KIVO MySQL] Error deleting installer metadata from MySQL:', err.message);
  }
}

export async function incrementDownloadCountInMysql(platform) {
  try {
    const currentPool = await getMysqlPool();
    if (!currentPool) return;
    await currentPool.query(
      'UPDATE kivo_installers_metadata SET download_count = download_count + 1 WHERE platform = ?',
      [platform]
    );
  } catch {}
}

// -------------------------------------------------------------
// Permanent Binary Storage in MySQL (Survives Container Restarts)
// -------------------------------------------------------------

// Save completed binary file into chunked rows in MySQL
export async function saveInstallerBinaryToMysql(platform, version, filePath, chunkSize = 2 * 1024 * 1024) {
  try {
    const currentPool = await getMysqlPool();
    if (!currentPool) {
      console.warn('[KIVO MySQL] Cannot save binary: MySQL pool not available.');
      return { success: false, error: 'MySQL not connected' };
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at ${filePath}`);
    }

    const stat = fs.statSync(filePath);
    const totalSize = stat.size;
    console.log(`[KIVO MySQL] Storing binary in MySQL for ${platform} (${(totalSize / (1024 * 1024)).toFixed(2)} MB)...`);

    // Clean any prior chunks for this platform in MySQL
    await currentPool.query('DELETE FROM kivo_installer_binary_chunks WHERE platform = ?', [platform]);

    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(chunkSize);
    let bytesRead = 0;
    let chunkIndex = 0;
    let totalBytesStored = 0;

    while ((bytesRead = fs.readSync(fd, buffer, 0, chunkSize, totalBytesStored)) > 0) {
      const chunkPayload = Buffer.from(buffer.subarray(0, bytesRead));
      const chunkSha = crypto.createHash('sha256').update(chunkPayload).digest('hex');
      const chunkId = crypto.randomUUID();

      await currentPool.query(
        `INSERT INTO kivo_installer_binary_chunks 
         (id, platform, version, chunk_index, chunk_size, chunk_data, sha256) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [chunkId, platform, version, chunkIndex, bytesRead, chunkPayload, chunkSha]
      );

      totalBytesStored += bytesRead;
      chunkIndex++;
    }

    fs.closeSync(fd);

    // Update metadata record in MySQL
    await currentPool.query(
      `UPDATE kivo_installers_metadata 
       SET has_db_binary = 1, binary_total_chunks = ?, binary_chunk_size = ?, updated_at = NOW() 
       WHERE platform = ?`,
      [chunkIndex, chunkSize, platform]
    );

    console.log(`[KIVO MySQL] Successfully stored ${chunkIndex} chunks (${totalBytesStored} bytes) in MySQL for ${platform}!`);
    return { success: true, totalChunks: chunkIndex, totalBytes: totalBytesStored };
  } catch (err) {
    console.error(`[KIVO MySQL] Failed to store binary in MySQL for ${platform}:`, err.message);
    return { success: false, error: err.message };
  }
}

// Check if binary chunks exist in MySQL for a platform
export async function checkInstallerBinaryInMysql(platform) {
  try {
    const currentPool = await getMysqlPool();
    if (!currentPool) return { exists: false, chunkCount: 0, totalBytes: 0 };

    const [rows] = await currentPool.query(
      'SELECT COUNT(*) as chunkCount, SUM(chunk_size) as totalBytes, MAX(version) as version FROM kivo_installer_binary_chunks WHERE platform = ?',
      [platform]
    );
    const count = Number(rows[0]?.chunkCount || 0);
    return {
      exists: count > 0,
      chunkCount: count,
      totalBytes: Number(rows[0]?.totalBytes || 0),
      version: rows[0]?.version || null,
    };
  } catch (err) {
    return { exists: false, chunkCount: 0, totalBytes: 0, error: err.message };
  }
}

// Restore binary from MySQL chunked rows to a local destination file on disk
export async function restoreInstallerBinaryFromMysql(platform, destPath) {
  try {
    const currentPool = await getMysqlPool();
    if (!currentPool) return null;

    const [chunks] = await currentPool.query(
      'SELECT chunk_index, chunk_size, chunk_data, sha256 FROM kivo_installer_binary_chunks WHERE platform = ? ORDER BY chunk_index ASC',
      [platform]
    );

    if (!chunks || chunks.length === 0) {
      return null;
    }

    console.log(`[KIVO MySQL] Restoring binary for ${platform} from MySQL (${chunks.length} chunks) to ${destPath}...`);

    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const tempPath = `${destPath}.restoring.${Date.now()}`;
    const writeStream = fs.createWriteStream(tempPath);
    const hash = crypto.createHash('sha256');
    let totalRestoredBytes = 0;

    for (const chunk of chunks) {
      hash.update(chunk.chunk_data);
      writeStream.write(chunk.chunk_data);
      totalRestoredBytes += chunk.chunk_size;
    }

    await new Promise((resolve, reject) => {
      writeStream.end((err) => (err ? reject(err) : resolve()));
    });

    const restoredSha = hash.digest('hex');

    // Atomic rename to destPath
    if (fs.existsSync(destPath)) {
      try {
        fs.unlinkSync(destPath);
      } catch {}
    }
    fs.renameSync(tempPath, destPath);

    console.log(`[KIVO MySQL] Successfully restored ${totalRestoredBytes} bytes to ${destPath} (SHA-256: ${restoredSha.slice(0, 16)}...)`);
    return {
      success: true,
      filePath: destPath,
      sha256: restoredSha,
      size: totalRestoredBytes,
    };
  } catch (err) {
    console.error(`[KIVO MySQL] Error restoring binary for ${platform} from MySQL:`, err.message);
    return null;
  }
}

// Stream binary directly from MySQL to client HTTP response (if local file is missing)
export async function streamInstallerBinaryFromMysql(res, platform, mimeType, filename) {
  try {
    const currentPool = await getMysqlPool();
    if (!currentPool) return false;

    const [metaRows] = await currentPool.query(
      'SELECT size_bytes, version, filename, sha256 FROM kivo_installers_metadata WHERE platform = ?',
      [platform]
    );
    const meta = metaRows[0];

    const [chunks] = await currentPool.query(
      'SELECT chunk_data, chunk_size FROM kivo_installer_binary_chunks WHERE platform = ? ORDER BY chunk_index ASC',
      [platform]
    );

    if (!chunks || chunks.length === 0) return false;

    const totalSize = meta?.size_bytes || chunks.reduce((acc, c) => acc + c.chunk_size, 0);
    const safeFilename = path.basename(filename || meta?.filename || `${platform}.bin`).replace(/["\r\n\t]/g, '_');

    res.writeHead(200, {
      'Content-Length': totalSize,
      'Content-Type': mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${safeFilename}"`,
      'Cache-Control': 'no-cache',
    });

    for (const chunk of chunks) {
      res.write(chunk.chunk_data);
    }
    res.end();
    return true;
  } catch (err) {
    console.error(`[KIVO MySQL] Error streaming binary from MySQL for ${platform}:`, err.message);
    return false;
  }
}

// Delete binary chunks from MySQL
export async function deleteInstallerBinaryFromMysql(platform) {
  try {
    const currentPool = await getMysqlPool();
    if (!currentPool) return;
    await currentPool.query('DELETE FROM kivo_installer_binary_chunks WHERE platform = ?', [platform]);
    await currentPool.query('UPDATE kivo_installers_metadata SET has_db_binary = 0, binary_total_chunks = 0 WHERE platform = ?', [platform]);
  } catch (err) {
    console.warn('[KIVO MySQL] Error deleting binary from MySQL:', err.message);
  }
}

export async function deleteTicketFromMysql(ticketId) {
  try {
    const currentPool = await getMysqlPool();
    if (!currentPool) return;
    await currentPool.query('DELETE FROM kivo_support_tickets WHERE id = ?', [ticketId]);
  } catch (err) {
    console.warn('[KIVO MySQL] Error deleting ticket from MySQL:', err.message);
  }
}
