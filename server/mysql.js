import mysql from 'mysql2/promise';
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
    // 1. Installers Metadata
    `CREATE TABLE IF NOT EXISTS kivo_installers_metadata (
      platform VARCHAR(32) PRIMARY KEY,
      name VARCHAR(128) NOT NULL,
      architecture VARCHAR(64) NOT NULL,
      filename VARCHAR(255) NOT NULL,
      version VARCHAR(32) NOT NULL,
      size_bytes BIGINT NOT NULL,
      sha256 VARCHAR(64) NOT NULL,
      file_path VARCHAR(512) NOT NULL,
      download_url VARCHAR(255) NOT NULL,
      uploaded_at DATETIME NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
// Installer Metadata MySQL Synchronization Helpers
// -------------------------------------------------------------
export async function syncInstallerMetadataToMysql(meta) {
  try {
    const currentPool = await getMysqlPool();
    if (!currentPool || !meta || typeof meta !== 'object') return;

    for (const [platform, item] of Object.entries(meta)) {
      if (!item || typeof item !== 'object') continue;
      await currentPool.query(
        `INSERT INTO kivo_installers_metadata 
          (platform, name, architecture, filename, version, size_bytes, sha256, file_path, download_url, uploaded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
          name = VALUES(name), architecture = VALUES(architecture), filename = VALUES(filename),
          version = VALUES(version), size_bytes = VALUES(size_bytes), sha256 = VALUES(sha256),
          file_path = VALUES(file_path), download_url = VALUES(download_url), uploaded_at = VALUES(uploaded_at)`,
        [
          platform,
          item.name || platform,
          item.architecture || 'x64',
          item.filename || 'installer',
          item.version || '1.0.0',
          item.size || 0,
          item.sha256 || '',
          item.filePath || '',
          item.downloadUrl || '',
          new Date(item.uploadedAt || Date.now()),
        ]
      );
    }
  } catch (err) {
    console.warn('[KIVO MySQL] Error syncing installer metadata:', err.message);
  }
}

export async function loadInstallerMetadataFromMysql() {
  try {
    const currentPool = await getMysqlPool();
    if (!currentPool) return null;

    const [rows] = await currentPool.query('SELECT * FROM kivo_installers_metadata');
    if (!rows || rows.length === 0) return null;

    const result = {};
    for (const row of rows) {
      result[row.platform] = {
        name: row.name,
        architecture: row.architecture,
        filename: row.filename,
        version: row.version,
        size: Number(row.size_bytes),
        sha256: row.sha256,
        filePath: row.file_path,
        downloadUrl: row.download_url,
        uploadedAt: new Date(row.uploaded_at).toISOString(),
        retention: 'permanent',
        retentionPolicy: 'indefinite_until_manual_removal',
        autoDelete: false,
      };
    }
    return result;
  } catch (err) {
    console.warn('[KIVO MySQL] Error loading installer metadata from MySQL:', err.message);
    return null;
  }
}

export async function deleteInstallerMetadataFromMysql(platform) {
  try {
    const currentPool = await getMysqlPool();
    if (!currentPool) return;
    await currentPool.query('DELETE FROM kivo_installers_metadata WHERE platform = ?', [platform]);
  } catch (err) {
    console.warn('[KIVO MySQL] Error deleting installer metadata from MySQL:', err.message);
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
