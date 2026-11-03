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
export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'kivoadminshaurya';

// Secure password configuration from server environment
// If not explicitly provided in env, defaults to a secure development password
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'KivoAdmin#2026!SecureKey';

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
