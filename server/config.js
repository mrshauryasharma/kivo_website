import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root directory of the application
export const APP_ROOT = path.resolve(__dirname, '..');

// Production Base URL (configured via environment variable, no hardcoded temporary preview URL)
export const APP_BASE_URL = (process.env.APP_BASE_URL || 'https://kivobrowser.com').replace(/\/+$/, '');

// Helper to verify directory is writable
function isWritableDir(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    const testFile = path.join(dirPath, `.write_test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
    fs.writeFileSync(testFile, 'kivo_storage_test');
    fs.unlinkSync(testFile);
    return true;
  } catch {
    return false;
  }
}

// Helper to determine best persistent storage root
// CRITICAL FIX: Ensures persistent storage resides in a truly permanent directory
// OUTSIDE the git/deployment directory so binaries survive container restarts,
// git imports, and fresh GoDaddy redeployments.
function resolvePersistentBaseDir() {
  const candidates = [];

  // 1. Explicitly configured persistent storage environment variables
  if (process.env.KIVO_STORAGE_PATH && process.env.KIVO_STORAGE_PATH.trim()) {
    candidates.push(path.resolve(process.env.KIVO_STORAGE_PATH.trim()));
  }
  if (process.env.PERSISTENT_STORAGE_DIR && process.env.PERSISTENT_STORAGE_DIR.trim()) {
    candidates.push(path.resolve(process.env.PERSISTENT_STORAGE_DIR.trim()));
  }
  if (process.env.GODADDY_STORAGE_DIR && process.env.GODADDY_STORAGE_DIR.trim()) {
    candidates.push(path.resolve(process.env.GODADDY_STORAGE_DIR.trim()));
  }

  // 2. User HOME directory: In cPanel / GoDaddy / Linux hosting, HOME is /home/username.
  // /home/username/kivo_persistent_storage is completely OUTSIDE the git repo directory,
  // so it survives all git pulls, branch switches, and container redeployments.
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (homeDir && typeof homeDir === 'string' && homeDir.trim()) {
    candidates.push(path.join(homeDir.trim(), 'kivo_persistent_storage'));
    candidates.push(path.join(homeDir.trim(), '.kivo_storage'));
  }

  // 3. Parent directory outside APP_ROOT (e.g. ../kivo_persistent_storage)
  try {
    const parent = path.resolve(APP_ROOT, '..');
    if (parent && parent !== APP_ROOT && path.dirname(parent) !== parent) {
      candidates.push(path.join(parent, 'kivo_persistent_storage'));
    }
  } catch {}

  // 4. Common persistent storage mount points on cloud Linux hosts
  if (process.platform !== 'win32') {
    candidates.push('/var/kivo_storage');
    candidates.push('/data/kivo_storage');
    candidates.push('/mnt/storage/kivo');
  }

  // 5. Fallback within public/assets only if outside paths cannot be created
  candidates.push(path.join(APP_ROOT, 'public', 'assets', 'persistent_storage'));
  candidates.push(path.join(APP_ROOT, 'public', 'assets'));

  for (const dir of candidates) {
    if (isWritableDir(dir)) {
      return dir;
    }
  }

  return path.join(APP_ROOT, 'public', 'assets');
}

export const PERSISTENT_BASE = resolvePersistentBaseDir();

// Persistent storage directory for installer binaries
export const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(PERSISTENT_BASE, 'installers');

// Permanent archive directory for previous installer versions (rollback support, never auto-deleted)
export const ARCHIVE_DIR = path.join(UPLOADS_DIR, 'archive');

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
export const USERS_FILE = path.join(DATA_DIR, 'users.json');
export const RELEASES_FILE = path.join(DATA_DIR, 'releases.json');

// Legacy paths for auto-migration if upgrading from earlier version
export const LEGACY_METADATA_FILE = path.join(APP_ROOT, 'storage', 'installers', 'metadata.json');
export const LEGACY_UPLOADS_DIR = path.join(APP_ROOT, 'storage', 'installers');

// Permanent file retention policy: Desktop installer files are NEVER auto-deleted.
// Retained permanently on disk until manually removed by an authorized administrator.
export const INSTALLER_RETENTION_POLICY = {
  retention: 'permanent',
  policy: 'indefinite_until_manual_removal',
  autoDelete: false,
  ttlHours: null,
  description:
    'Desktop installer binaries are permanently retained in persistent storage and will never be automatically deleted by any system TTL, cron, or interval. Only explicit manual deletion by an authorized administrator is permitted.',
};

// Candidate persistent storage roots where installer binaries may reside
export function getCandidateStorageDirs() {
  const dirs = [
    UPLOADS_DIR,
    path.join(PERSISTENT_BASE, 'installers'),
    LEGACY_UPLOADS_DIR,
    path.join(APP_ROOT, 'public', 'assets', 'installers'),
    path.join(APP_ROOT, 'storage', 'installers'),
    path.join(APP_ROOT, 'public', 'assets'),
  ];
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (homeDir) {
    dirs.push(path.join(homeDir, 'kivo_persistent_storage', 'installers'));
    dirs.push(path.join(homeDir, 'public_html', 'assets', 'installers'));
  }
  try {
    const parent = path.resolve(APP_ROOT, '..');
    dirs.push(path.join(parent, 'kivo_persistent_storage', 'installers'));
  } catch {}
  return [...new Set(dirs.filter(Boolean))];
}

// Resolve physical binary across candidate persistent storage roots
export function resolveInstallerFilePath(platform, filename, preferredPath) {
  if (preferredPath && typeof preferredPath === 'string') {
    try {
      if (fs.existsSync(preferredPath)) {
        const stat = fs.statSync(preferredPath);
        if (stat.isFile() && stat.size > 0) return preferredPath;
      }
    } catch {}
  }

  const rule = PLATFORM_RULES[platform];
  const ext = path.extname(filename || rule?.defaultFileName || '');
  const candidateFilenames = [
    filename,
    `${platform}${ext}`,
    rule?.defaultFileName,
  ].filter(Boolean);

  const candidateDirs = getCandidateStorageDirs();

  for (const dir of candidateDirs) {
    for (const name of candidateFilenames) {
      const candidatePath = path.join(dir, name);
      try {
        if (fs.existsSync(candidatePath)) {
          const stat = fs.statSync(candidatePath);
          if (stat.isFile() && stat.size > 0) {
            // Auto-relocate to primary UPLOADS_DIR if found in a legacy or candidate directory
            const destPath = path.join(UPLOADS_DIR, `${platform}${ext}`);
            if (candidatePath !== destPath && !fs.existsSync(destPath)) {
              try {
                fs.copyFileSync(candidatePath, destPath);
                return destPath;
              } catch {
                return candidatePath;
              }
            }
            return candidatePath;
          }
        }
      } catch {}
    }
  }

  return null;
}

// Ensure all persistent directories exist
for (const dir of [UPLOADS_DIR, ARCHIVE_DIR, CHUNKS_DIR, DATA_DIR, ATTACHMENTS_DIR]) {
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
    if (fs.existsSync(LEGACY_METADATA_FILE) && !fs.existsSync(METADATA_FILE)) {
      console.log(`[KIVO Storage] Migrating legacy metadata from ${LEGACY_METADATA_FILE} to ${METADATA_FILE}`);
      fs.copyFileSync(LEGACY_METADATA_FILE, METADATA_FILE);
    }

    const candidateDirs = getCandidateStorageDirs().filter((d) => d !== UPLOADS_DIR && !d.includes('archive'));
    for (const legacyDir of candidateDirs) {
      if (fs.existsSync(legacyDir)) {
        try {
          const files = fs.readdirSync(legacyDir);
          for (const file of files) {
            if (file.endsWith('.exe') || file.endsWith('.dmg') || file.endsWith('.apk')) {
              const src = path.join(legacyDir, file);
              const dest = path.join(UPLOADS_DIR, file);
              if (!fs.existsSync(dest)) {
                console.log(`[KIVO Storage] Migrating legacy installer ${file} from ${legacyDir} to ${dest}`);
                fs.copyFileSync(src, dest);
              }
            }
          }
        } catch {
          // Skip inaccessible dir
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
    appBaseUrl: APP_BASE_URL,
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
  console.log(`  - APP_BASE_URL: ${APP_BASE_URL}`);
  console.log(`  - PERSISTENT STORAGE: ${UPLOADS_DIR}`);
  console.log(`  - DATA STORAGE: ${DATA_DIR}`);

  if (!diag.isConfigured) {
    console.error(
      '[KIVO Auth Diagnostic] ⚠️ CRITICAL: The secret KIVO_ADMIN_PASSWORD is not configured in GoDaddy environment variables!'
    );
  }
}

// GoDaddy 25 GB Hosting Storage Quotas
export const GODADDY_MAX_STORAGE_BYTES = 25 * 1024 * 1024 * 1024; // 25 GB
export const SAFE_STORAGE_CAP_BYTES = 23.5 * 1024 * 1024 * 1024; // 23.5 GB safety threshold
export const MIN_FREE_DISK_BYTES = 500 * 1024 * 1024; // 500 MB minimum reserve

// Helper for Windows User Environment fallback (local test / staging parity)
function getWinUserEnv(key) {
  if (process.platform !== 'win32') return '';
  try {
    return execSync(`powershell -NoProfile -Command "[System.Environment]::GetEnvironmentVariable('${key}', 'User')"`, { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

// MySQL Database Configuration (GoDaddy cPanel / Managed MySQL)
export function getMysqlConfig() {
  const host = process.env.DB_HOST || process.env.MYSQL_HOST || getWinUserEnv('DB_HOST');
  const user = process.env.DB_USER || process.env.MYSQL_USER || getWinUserEnv('DB_USER');
  const password = process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || getWinUserEnv('DB_PASSWORD');
  const database = process.env.DB_NAME || process.env.MYSQL_DATABASE || getWinUserEnv('DB_NAME');
  const port = Number(process.env.DB_PORT || process.env.MYSQL_PORT || getWinUserEnv('DB_PORT')) || 3306;

  const isConfigured = Boolean(host && user && database && password);

  return {
    isConfigured,
    host,
    user,
    password,
    database,
    port,
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
    connectTimeout: 10000,
  };
}

export const ADMIN_USERNAME = () => getAdminCredentials().rawUsername?.trim() || '';
export const SESSION_SECRET = process.env.SESSION_SECRET || 'kivo-browser-secure-session-secret-key-32chars';

// Installer max file size: 2 GB
export const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;
export const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024;

// Support ticket attachment maximum size: 50 MB per file (enforced server-side, not advertised in customer UI)
export const MAX_ATTACHMENT_SIZE = 50 * 1024 * 1024; // 52,428,800 bytes

// Allowed attachment file extensions
export const ALLOWED_ATTACHMENT_EXTENSIONS = [
  // Images
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg',
  // Documents & logs
  '.pdf', '.txt', '.log', '.doc', '.docx', '.rtf', '.csv', '.json', '.md',
  // Archives
  '.zip', '.tar', '.gz', '.7z',
  // Media & Crash dumps
  '.mp4', '.webm', '.mov', '.dmp', '.crash'
];

// Helper to validate magic byte signatures for common critical file types
export function validateFileMagicBytes(buffer, ext) {
  if (!buffer || buffer.length < 4) return true; // allow small text files
  const lowerExt = ext.toLowerCase();

  // PNG: 89 50 4E 47
  if (lowerExt === '.png') {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  }
  // JPEG: FF D8 FF
  if (lowerExt === '.jpg' || lowerExt === '.jpeg') {
    return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  }
  // PDF: %PDF (25 50 44 46)
  if (lowerExt === '.pdf') {
    return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
  }
  // GIF: GIF8 (47 49 46 38)
  if (lowerExt === '.gif') {
    return buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38;
  }
  // ZIP (also docx and android APK): PK.. (50 4B 03 04 or 50 4B 05 06)
  if (lowerExt === '.zip' || lowerExt === '.apk' || lowerExt === '.docx') {
    return buffer[0] === 0x50 && buffer[1] === 0x4B;
  }

  // Text, logs, and others pass basic extension check
  return true;
}

export const PLATFORM_RULES = {
  android: {
    name: 'Android Mobile',
    architecture: 'Universal APK (ARM64 / v7a / x86_64)',
    allowedExtensions: ['.apk'],
    defaultFileName: 'KivoBrowser.apk',
    mimeType: 'application/vnd.android.package-archive',
  },
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
