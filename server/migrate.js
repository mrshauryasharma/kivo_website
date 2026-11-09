import fs from 'node:fs';
import path from 'node:path';
import {
  METADATA_FILE,
  CMS_FILE,
  TICKETS_FILE,
  DATA_DIR,
} from './config.js';

// -------------------------------------------------------------
// 1. Safe JSON Data Backup
// -------------------------------------------------------------
export function backupJsonData(backupDir = null) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const targetDir = backupDir || path.join(path.dirname(DATA_DIR), 'backups', `json_backup_${timestamp}`);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const backedUpFiles = [];

  const filesToBackup = [
    { name: 'installers_metadata.json', path: METADATA_FILE },
    { name: 'cms_content.json', path: CMS_FILE },
    { name: 'support_tickets.json', path: TICKETS_FILE },
  ];

  for (const item of filesToBackup) {
    if (fs.existsSync(item.path)) {
      const dest = path.join(targetDir, item.name);
      fs.copyFileSync(item.path, dest);
      const stat = fs.statSync(dest);
      backedUpFiles.push({ name: item.name, sizeBytes: stat.size, dest });
    }
  }

  return {
    success: true,
    targetDir,
    timestamp,
    backedUpFiles,
  };
}

// -------------------------------------------------------------
// 2. Inspect JSON Data Structure & Record Counts
// -------------------------------------------------------------
export function inspectJsonData() {
  const summary = {
    installers: { count: 0, items: [] },
    cms: { hasDraft: false, hasPublished: false, revisionCount: 0 },
    tickets: {
      totalTickets: 0,
      totalMessages: 0,
      totalAttachments: 0,
      totalStatusHistory: 0,
      totalInternalNotes: 0,
      totalVerificationTokens: 0,
      totalEmailLogs: 0,
    },
  };

  // 1. Installers
  if (fs.existsSync(METADATA_FILE)) {
    try {
      const meta = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
      summary.installers.items = Object.keys(meta);
      summary.installers.count = summary.installers.items.length;
    } catch {}
  }

  // 2. CMS
  if (fs.existsSync(CMS_FILE)) {
    try {
      const cms = JSON.parse(fs.readFileSync(CMS_FILE, 'utf8'));
      summary.cms.hasDraft = Boolean(cms.draft);
      summary.cms.hasPublished = Boolean(cms.published);
      summary.cms.revisionCount = Array.isArray(cms.history) ? cms.history.length : 0;
    } catch {}
  }

  // 3. Tickets
  if (fs.existsSync(TICKETS_FILE)) {
    try {
      const tStore = JSON.parse(fs.readFileSync(TICKETS_FILE, 'utf8'));
      if (Array.isArray(tStore.tickets)) {
        summary.tickets.totalTickets = tStore.tickets.length;
        for (const t of tStore.tickets) {
          if (Array.isArray(t.messages)) summary.tickets.totalMessages += t.messages.length;
          if (Array.isArray(t.statusHistory)) summary.tickets.totalStatusHistory += t.statusHistory.length;
          if (Array.isArray(t.internalNotes)) summary.tickets.totalInternalNotes += t.internalNotes.length;
          if (Array.isArray(t.emailLogs)) summary.tickets.totalEmailLogs += t.emailLogs.length;
          if (Array.isArray(t.messages)) {
            for (const m of t.messages) {
              if (Array.isArray(m.attachments)) summary.tickets.totalAttachments += m.attachments.length;
            }
          }
        }
      }
      if (Array.isArray(tStore.verificationTokens)) {
        summary.tickets.totalVerificationTokens = tStore.verificationTokens.length;
      }
    } catch {}
  }

  return summary;
}

// -------------------------------------------------------------
// 3. Migrate JSON to MySQL (Idempotent & Preserves Data)
// -------------------------------------------------------------
export async function migrateJsonToMysql(pool) {
  if (!pool) throw new Error('MySQL connection pool is required for migration.');

  const backupResult = backupJsonData();
  const jsonSummary = inspectJsonData();

  console.log(`[KIVO Migrate] Pre-migration backup saved to: ${backupResult.targetDir}`);
  console.log(`[KIVO Migrate] Source JSON record summary:`, jsonSummary);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // A. Migrate Installers Metadata
    if (fs.existsSync(METADATA_FILE)) {
      const meta = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
      for (const [platform, item] of Object.entries(meta)) {
        if (!item || typeof item !== 'object') continue;
        await connection.query(
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
    }

    // B. Migrate CMS Content & History
    if (fs.existsSync(CMS_FILE)) {
      const cms = JSON.parse(fs.readFileSync(CMS_FILE, 'utf8'));
      if (cms.published || cms.draft) {
        await connection.query(
          `INSERT INTO kivo_cms_content (section_key, draft_json, published_json)
           VALUES ('website_root', ?, ?)
           ON DUPLICATE KEY UPDATE draft_json = VALUES(draft_json), published_json = VALUES(published_json)`,
          [JSON.stringify(cms.draft || cms.published), JSON.stringify(cms.published || cms.draft)]
        );
      }

      if (Array.isArray(cms.history)) {
        for (const h of cms.history) {
          await connection.query(
            `INSERT INTO kivo_cms_history (id, section_key, content_json, author, action_type, created_at)
             VALUES (?, 'website_root', ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE action_type = VALUES(action_type)`,
            [
              h.id || `hist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              JSON.stringify(h.content || {}),
              h.author || 'admin',
              h.actionType || h.action_type || h.comment || 'revision',
              new Date(h.timestamp || Date.now()),
            ]
          );
        }
      }
    }

    // C. Migrate Support Tickets & Related Entities
    if (fs.existsSync(TICKETS_FILE)) {
      const tStore = JSON.parse(fs.readFileSync(TICKETS_FILE, 'utf8'));
      if (Array.isArray(tStore.tickets)) {
        for (const t of tStore.tickets) {
          // Ticket Master
          await connection.query(
            `INSERT INTO kivo_support_tickets 
              (id, name, email, phone, category, subject, description, status, priority, assignee, created_at, updated_at, last_response_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
              name = VALUES(name), email = VALUES(email), phone = VALUES(phone), status = VALUES(status),
              priority = VALUES(priority), assignee = VALUES(assignee), updated_at = VALUES(updated_at)`,
            [
              t.id,
              t.name || 'Customer',
              t.email || 'customer@example.com',
              t.phone || '',
              t.category || 'General Feedback',
              t.subject || 'Support Request',
              t.description || '',
              t.status || 'Open',
              t.priority || 'Normal',
              t.assignee || 'Unassigned',
              new Date(t.createdAt || Date.now()),
              new Date(t.updatedAt || Date.now()),
              t.lastResponseAt ? new Date(t.lastResponseAt) : null,
            ]
          );

          // Messages
          if (Array.isArray(t.messages)) {
            for (const m of t.messages) {
              const msgId = m.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
              await connection.query(
                `INSERT INTO kivo_ticket_messages (id, ticket_id, sender, sender_type, message_text, email_status, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE message_text = VALUES(message_text)`,
                [
                  msgId,
                  t.id,
                  m.sender || m.senderName || t.name || 'Customer',
                  m.senderType || 'customer',
                  m.text || m.message_text || '',
                  m.emailStatus || 'pending',
                  new Date(m.timestamp || m.createdAt || Date.now()),
                ]
              );

              // Attachments
              if (Array.isArray(m.attachments)) {
                for (const att of m.attachments) {
                  const attId = att.id || `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
                  await connection.query(
                    `INSERT INTO kivo_ticket_attachments (id, ticket_id, message_id, filename, original_name, mime_type, size_bytes, file_path, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE original_name = VALUES(original_name)`,
                    [
                      attId,
                      t.id,
                      msgId,
                      att.filename || 'stored_file',
                      att.originalName || att.filename || 'attachment',
                      att.mimeType || 'application/octet-stream',
                      att.size || 0,
                      att.filePath || '',
                      new Date(att.uploadedAt || att.createdAt || Date.now()),
                    ]
                  );
                }
              }
            }
          }

          // Status History
          if (Array.isArray(t.statusHistory)) {
            for (const sh of t.statusHistory) {
              const shId = sh.id || `sh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
              await connection.query(
                `INSERT INTO kivo_ticket_status_history (id, ticket_id, from_status, to_status, changed_by, reason, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE to_status = VALUES(to_status)`,
                [
                  shId,
                  t.id,
                  sh.from || null,
                  sh.to || 'Open',
                  sh.changedBy || 'customer',
                  sh.reason || null,
                  new Date(sh.timestamp || sh.createdAt || Date.now()),
                ]
              );
            }
          }

          // Internal Staff Notes
          if (Array.isArray(t.internalNotes)) {
            for (const n of t.internalNotes) {
              const noteId = n.id || `note_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
              await connection.query(
                `INSERT INTO kivo_ticket_internal_notes (id, ticket_id, author, note_text, created_at)
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE note_text = VALUES(note_text)`,
                [
                  noteId,
                  t.id,
                  n.author || 'Staff',
                  n.text || n.note || '',
                  new Date(n.timestamp || n.createdAt || Date.now()),
                ]
              );
            }
          }
        }
      }

      // Verification Tokens
      if (Array.isArray(tStore.verificationTokens)) {
        for (const vt of tStore.verificationTokens) {
          const vtId = vt.id || `vt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          await connection.query(
            `INSERT INTO kivo_ticket_verification_tokens (id, ticket_id, email, phone, otp_code, magic_token, used, expires_at, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE otp_code = VALUES(otp_code)`,
            [
              vtId,
              vt.ticketId,
              vt.email || '',
              vt.phone || '',
              vt.otpCode || vt.otp || '',
              vt.magicToken || '',
              vt.used ? 1 : 0,
              new Date(vt.expiresAt || Date.now() + 15 * 60 * 1000),
              new Date(vt.createdAt || Date.now()),
            ]
          );
        }
      }
    }

    await connection.commit();
    console.log('[KIVO Migrate] Database transaction committed successfully.');

    // Verification
    const [tCount] = await connection.query('SELECT COUNT(*) as cnt FROM kivo_support_tickets');
    const [mCount] = await connection.query('SELECT COUNT(*) as cnt FROM kivo_ticket_messages');
    const [cCount] = await connection.query('SELECT COUNT(*) as cnt FROM kivo_cms_content');

    return {
      success: true,
      backupPath: backupResult.targetDir,
      migratedCounts: {
        tickets: tCount[0]?.cnt || 0,
        messages: mCount[0]?.cnt || 0,
        cmsSections: cCount[0]?.cnt || 0,
      },
    };
  } catch (err) {
    await connection.rollback();
    console.error('[KIVO Migrate] Migration failed, transaction rolled back:', err.message);
    throw err;
  } finally {
    connection.release();
  }
}
