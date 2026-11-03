import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root directory of the application
export const APP_ROOT = path.resolve(__dirname, '..');

// Persistent storage directory for installers (configurable via environment variable)
export const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(APP_ROOT, 'storage', 'installers');

// Directory for temporary upload chunks
export const CHUNKS_DIR = path.join(APP_ROOT, 'storage', 'chunks');

// Path to persistent metadata file
export const METADATA_FILE = path.join(UPLOADS_DIR, 'metadata.json');

// Ensure storage directories exist
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(CHUNKS_DIR)) {
  fs.mkdirSync(CHUNKS_DIR, { recursive: true });
}

// Authentication & Session configuration
// Read exact environment variables: KIVO_ADMIN_USERNAME and KIVO_ADMIN_PASSWORD
// Also support ADMIN_USERNAME and ADMIN_PASSWORD as fallback if KIVO_ADMIN_* is omitted
export function getAdminCredentials() {
  const rawUsername = process.env.KIVO_ADMIN_USERNAME || process.env.ADMIN_USERNAME;
  const rawPassword = process.env.KIVO_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

  return {
    rawUsername: typeof rawUsername === 'string' && rawUsername.length > 0 ? rawUsername : undefined,
    rawPassword: typeof rawPassword === 'string' && rawPassword.length > 0 ? rawPassword : undefined,
  };
}

// Check admin credentials configuration and detect any whitespace / newlines safely
export function checkAdminEnvConfig() {
  const { rawUsername, rawPassword } = getAdminCredentials();

  const isUsernameSet = Boolean(rawUsername && rawUsername.trim().length > 0);
  const isPasswordSet = Boolean(rawPassword && rawPassword.length > 0);

  const hasUsernameWhitespace = isUsernameSet && (rawUsername !== rawUsername.trim() || /[\r\n]/.test(rawUsername));
  const hasPasswordWhitespace = isPasswordSet && (/[\r\n]/.test(rawPassword) || /^\s+|\s+$/.test(rawPassword));

  return {
    isConfigured: isUsernameSet && isPasswordSet,
    isUsernameSet,
    isPasswordSet,
    usingKivoPrefix: Boolean(process.env.KIVO_ADMIN_USERNAME && process.env.KIVO_ADMIN_PASSWORD),
    usernameLength: isUsernameSet ? rawUsername.length : 0,
    passwordLength: isPasswordSet ? rawPassword.length : 0,
    hasUsernameWhitespace,
    hasPasswordWhitespace,
  };
}

// Log safe diagnostics on the server without ever exposing secret values
export function logSafeAuthDiagnostics() {
  const diag = checkAdminEnvConfig();
  console.log('[KIVO Auth Diagnostic] Environment Credentials Check:');
  console.log(
    `  - KIVO_ADMIN_USERNAME: ${
      diag.isUsernameSet
        ? `CONFIGURED (len: ${diag.usernameLength}${diag.hasUsernameWhitespace ? ', notice: contains whitespace/newline' : ''})`
        : 'MISSING ❌'
    }`
  );
  console.log(
    `  - KIVO_ADMIN_PASSWORD: ${
      diag.isPasswordSet
        ? `CONFIGURED (len: ${diag.passwordLength}${diag.hasPasswordWhitespace ? ', notice: contains whitespace/newline' : ''})`
        : 'MISSING ❌'
    }`
  );
  console.log(
    `  - SESSION_SECRET: ${process.env.SESSION_SECRET ? 'CONFIGURED (custom secret)' : 'CONFIGURED (default session secret)'}`
  );

  if (!diag.isConfigured) {
    console.error(
      '[KIVO Auth Diagnostic] ⚠️ CRITICAL: Admin credentials are not configured in environment variables!'
    );
    console.error(
      '                       Please set KIVO_ADMIN_USERNAME and KIVO_ADMIN_PASSWORD on your server.'
    );
  }
}

// Legacy getter for username (without hardcoded fallback)
export const ADMIN_USERNAME = () => getAdminCredentials().rawUsername?.trim() || '';

// Session signing secret
export const SESSION_SECRET = process.env.SESSION_SECRET || 'kivo-browser-secure-session-secret-key-32chars';

// Max file size: 2 GB
export const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2,147,483,648 bytes

// Default chunk size: 5 MB (safely below proxy 100MB body limits)
export const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024; // 5,242,880 bytes

// Platform rules & constraints
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
