import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root directory of the application
export const APP_ROOT = path.resolve(__dirname, '..');

// Helper to determine best persistent storage root
function resolvePersistentBaseDir() {
  if (process.env.PERSISTENT_STORAGE_DIR) {
    return path.resolve(process.env.PERSISTENT_STORAGE_DIR);
  }
  if (process.env.GODADDY_STORAGE_DIR) {
    return path.resolve(process.env.GODADDY_STORAGE_DIR);
  }
  // If user HOME exists and is outside ephemeral deployment root (common on Linux/cPanel)
  if (process.env.HOME && fs.existsSync(process.env.HOME) && !APP_ROOT.startsWith(process.env.HOME)) {
    const homeStorage = path.join(process.env.HOME, 'kivo_persistent_storage');
    try {
      if (!fs.existsSync(homeStorage)) {
        fs.mkdirSync(homeStorage, { recursive: true });
      }
      return homeStorage;
    } catch {
      // Fallback if not writable
    }
  }
  // GoDaddy documented persistent public/assets or storage fallback
  return path.join(APP_ROOT, 'public', 'assets');
}

const PERSISTENT_BASE = resolvePersistentBaseDir();

// Persistent storage directory for installer binaries
export const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(PERSISTENT_BASE, 'installers');

// Directory for temporary upload chunks
export const CHUNKS_DIR = process.env.CHUNKS_DIR
  ? path.resolve(process.env.CHUNKS_DIR)
  : path.join(APP_ROOT, 'storage', 'chunks');

// Directory for database files (CMS content, tickets, metadata)
export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(PERSISTENT_BASE, 'data');

// Private directory for support ticket attachments (NOT publicly accessible via web)
export const ATTACHMENTS_DIR = process.env.ATTACHMENTS_DIR
  ? path.resolve(process.env.ATTACHMENTS_DIR)
  : path.join(PERSISTENT_BASE, 'attachments');

// Path to persistent data files
export const METADATA_FILE = path.join(DATA_DIR, 'installers_metadata.json');
export const CMS_FILE = path.join(DATA_DIR, 'cms_content.json');
export const TICKETS_FILE = path.join(DATA_DIR, 'support_tickets.json');

// Legacy paths for auto-migration if upgrading from earlier version
export const LEGACY_METADATA_FILE = path.join(APP_ROOT, 'storage', 'installers', 'metadata.json');
export const LEGACY_UPLOADS_DIR = path.join(APP_ROOT, 'storage', 'installers');

// Ensure all persistent directories exist
for (const dir of [UPLOADS_DIR, CHUNKS_DIR, DATA_DIR, ATTACHMENTS_DIR]) {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    console.error(`[KIVO Storage] Failed to create directory ${dir}:`, err);
  }
}

// Auto-migrate legacy files to persistent directory if needed
function runStorageMigration() {
  try {
    // 1. Check legacy metadata file
    if (fs.existsSync(LEGACY_METADATA_FILE) && !fs.existsSync(METADATA_FILE)) {
      console.log(`[KIVO Storage] Migrating legacy metadata from ${LEGACY_METADATA_FILE} to ${METADATA_FILE}`);
      fs.copyFileSync(LEGACY_METADATA_FILE, METADATA_FILE);
    }

    // 2. Check legacy installer files
    if (fs.existsSync(LEGACY_UPLOADS_DIR) && LEGACY_UPLOADS_DIR !== UPLOADS_DIR) {
      const files = fs.readdirSync(LEGACY_UPLOADS_DIR);
      for (const file of files) {
        if (file.endsWith('.exe') || file.endsWith('.dmg')) {
          const src = path.join(LEGACY_UPLOADS_DIR, file);
          const dest = path.join(UPLOADS_DIR, file);
          if (!fs.existsSync(dest)) {
            console.log(`[KIVO Storage] Migrating legacy installer ${file} to ${dest}`);
            fs.copyFileSync(src, dest);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[KIVO Storage] Migration warning:', err.message);
  }
}
runStorageMigration();

// Authentication & Session configuration
export function getAdminCredentials() {
  const envUsername = process.env.KIVO_ADMIN_USERNAME || process.env.ADMIN_USERNAME;
  const rawUsername =
    typeof envUsername === 'string' && envUsername.trim().length > 0
      ? envUsername.trim()
      : 'kivoadminshaurya';

  const rawPassword = process.env.KIVO_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

  return {
    rawUsername,
    rawPassword: typeof rawPassword === 'string' && rawPassword.length > 0 ? rawPassword : undefined,
  };
}

export function checkAdminEnvConfig() {
  const { rawUsername, rawPassword } = getAdminCredentials();

  const isExplicitUsernameSet = Boolean(
    (process.env.KIVO_ADMIN_USERNAME && process.env.KIVO_ADMIN_USERNAME.trim().length > 0) ||
    (process.env.ADMIN_USERNAME && process.env.ADMIN_USERNAME.trim().length > 0)
  );
  const isPasswordSet = Boolean(rawPassword && rawPassword.length > 0);

  const rawUserEnv = process.env.KIVO_ADMIN_USERNAME || process.env.ADMIN_USERNAME || '';
  const hasUsernameWhitespace = isExplicitUsernameSet && (rawUserEnv !== rawUserEnv.trim() || /[\r\n]/.test(rawUserEnv));
  const hasPasswordWhitespace = isPasswordSet && (/[\r\n]/.test(rawPassword) || /^\s+|\s+$/.test(rawPassword));

  return {
    isConfigured: isPasswordSet,
    isUsernameSet: true,
    isExplicitUsernameSet,
    username: rawUsername,
    isPasswordSet,
    usingKivoPrefix: Boolean(process.env.KIVO_ADMIN_PASSWORD),
    passwordLength: isPasswordSet ? rawPassword.length : 0,
    hasUsernameWhitespace,
    hasPasswordWhitespace,
  };
}

// Resend Email Configuration
export function getEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY || '';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'KIVO Support <onboarding@resend.dev>';
  const supportEmail = process.env.SUPPORT_NOTIFICATION_EMAIL || 'support@kivobrowser.com';

  return {
    isConfigured: Boolean(apiKey && apiKey.trim().startsWith('re_')),
    apiKey: apiKey.trim(),
    fromEmail: fromEmail.trim(),
    supportEmail: supportEmail.trim(),
  };
}

export function logSafeAuthDiagnostics() {
  const diag = checkAdminEnvConfig();
  const emailCfg = getEmailConfig();

  console.log('[KIVO Auth Diagnostic] Environment Credentials Check:');
  console.log(
    `  - KIVO_ADMIN_USERNAME: ${
      diag.isExplicitUsernameSet
        ? `CONFIGURED (using "${diag.username}"${diag.hasUsernameWhitespace ? ', notice: contains whitespace/newline' : ''})`
        : `ACTIVE (expected: "${diag.username}")`
    }`
  );
  console.log(
    `  - KIVO_ADMIN_PASSWORD: ${
      diag.isPasswordSet
        ? `CONFIGURED (len: ${diag.passwordLength}${diag.hasPasswordWhitespace ? ', notice: contains whitespace/newline' : ''})`
        : 'MISSING ❌ (Configure KIVO_ADMIN_PASSWORD secret in GoDaddy)'
    }`
  );
  console.log(
    `  - RESEND_API_KEY: ${
      emailCfg.isConfigured
        ? 'CONFIGURED ✅ (Resend email delivery active)'
        : 'NOT CONFIGURED ⚠️ (Emails will be queued/logged locally)'
    }`
  );
  console.log(`  - PERSISTENT STORAGE: ${UPLOADS_DIR}`);
  console.log(`  - DATA STORAGE: ${DATA_DIR}`);

  if (!diag.isConfigured) {
    console.error(
      '[KIVO Auth Diagnostic] ⚠️ CRITICAL: The secret KIVO_ADMIN_PASSWORD is not configured in GoDaddy environment variables!'
    );
  }
}

export const ADMIN_USERNAME = () => getAdminCredentials().rawUsername?.trim() || '';
export const SESSION_SECRET = process.env.SESSION_SECRET || 'kivo-browser-secure-session-secret-key-32chars';

export const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB
export const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB

export const PLATFORM_RULES = {
  windows: {
    name: 'Windows Desktop',
    architecture: '64-bit (x64)',
    allowedExtensions: ['.exe'],
    defaultFileName: 'KivoSetup-x64.exe',
    mimeType: 'application/x-msdownload',
  },
  'mac-arm64': {
    name: 'macOS Apple Silicon',
    architecture: 'Apple Silicon (ARM64)',
    allowedExtensions: ['.dmg'],
    defaultFileName: 'Kivo-arm64.dmg',
    mimeType: 'application/x-apple-diskimage',
  },
  'mac-intel': {
    name: 'macOS Intel',
    architecture: 'Intel 64-bit (x64)',
    allowedExtensions: ['.dmg'],
    defaultFileName: 'Kivo-intel.dmg',
    mimeType: 'application/x-apple-diskimage',
  },
};
