import crypto from 'node:crypto';
import { getAdminCredentials, SESSION_SECRET } from './config.js';

// In-memory session store: Map<sessionId, { username: string, csrfToken: string, expiresAt: number }>
const activeSessions = new Map();

// Login rate limiter: Map<ip, { failedAttempts: number, lockoutUntil: number }>
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000; // 8 hours

// Helper: safe string comparison using timingSafeEqual
export function timingSafeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    // Constant time dummy comparison
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

// Helper: sign session ID
export function signSessionId(sessionId) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(sessionId).digest('hex');
}

// Verify session signature
export function verifySessionSignature(sessionId, signature) {
  const expected = signSessionId(sessionId);
  return timingSafeCompare(expected, signature);
}

// Check rate limit for IP
export function checkRateLimit(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record) return { allowed: true, remaining: MAX_ATTEMPTS };

  if (record.lockoutUntil > now) {
    const minutesLeft = Math.ceil((record.lockoutUntil - now) / 60000);
    return {
      allowed: false,
      message: `Too many failed login attempts. Please try again in ${minutesLeft} minute(s).`,
      retryAfterSeconds: Math.ceil((record.lockoutUntil - now) / 1000),
    };
  }

  // Reset expired lockout
  if (record.lockoutUntil && record.lockoutUntil <= now) {
    loginAttempts.delete(ip);
    return { allowed: true, remaining: MAX_ATTEMPTS };
  }

  return { allowed: true, remaining: MAX_ATTEMPTS - record.failedAttempts };
}

// Record failed login attempt
export function recordFailedAttempt(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { failedAttempts: 0, lockoutUntil: 0 };
  record.failedAttempts += 1;

  if (record.failedAttempts >= MAX_ATTEMPTS) {
    record.lockoutUntil = now + LOCKOUT_DURATION_MS;
  }
  loginAttempts.set(ip, record);
}

// Clear failed attempts on successful login
export function resetLoginAttempts(ip) {
  loginAttempts.delete(ip);
}

// Authenticate user credentials
export function authenticateAdmin(username, password, ip) {
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    return { success: false, error: rateLimit.message, status: 429 };
  }

  // Retrieve current environment credentials
  const { rawUsername, rawPassword } = getAdminCredentials();

  // Requirement 6: Clear server-side error if either environment variable is missing
  if (!rawUsername || !rawPassword) {
    console.error(
      '[KIVO Auth Diagnostic] ❌ Login rejected: KIVO_ADMIN_USERNAME or KIVO_ADMIN_PASSWORD is missing in server environment.'
    );
    return {
      success: false,
      error:
        'Admin authentication is not configured on the server. Please configure KIVO_ADMIN_USERNAME and KIVO_ADMIN_PASSWORD in server environment variables.',
      code: 'AUTH_ENV_MISSING',
      status: 500,
    };
  }

  // Safe diagnostic detection of whitespace or accidental newlines in environment values
  const hasUsernameWhitespace = rawUsername !== rawUsername.trim() || /[\r\n]/.test(rawUsername);
  const hasPasswordWhitespace = /[\r\n]/.test(rawPassword) || /^\s+|\s+$/.test(rawPassword);

  if (hasUsernameWhitespace) {
    console.warn('[KIVO Auth Diagnostic] Notice: KIVO_ADMIN_USERNAME environment variable contains whitespace or newlines.');
  }
  if (hasPasswordWhitespace) {
    console.warn('[KIVO Auth Diagnostic] Notice: KIVO_ADMIN_PASSWORD environment variable contains whitespace or newlines.');
  }

  // 1. Verify username (accepts exact match or trimmed match)
  const usernameValid =
    timingSafeCompare(username, rawUsername) ||
    timingSafeCompare(username?.trim(), rawUsername.trim());

  // 2. Verify password
  // Requirement 5: Check for whitespace or accidental newline issues without silently changing the actual password
  let passwordValid = timingSafeCompare(password, rawPassword);

  if (!passwordValid) {
    // Check if the environment variable contained an accidental trailing newline (CR/LF) or surrounding whitespace
    const strippedEnvNewline = rawPassword.replace(/[\r\n]+$/, '');
    const trimmedEnv = rawPassword.trim();
    const trimmedInput = typeof password === 'string' ? password.trim() : '';

    if (timingSafeCompare(password, strippedEnvNewline)) {
      passwordValid = true;
      console.log('[KIVO Auth Diagnostic] Notice: Password matched after stripping accidental newline from environment variable.');
    } else if (timingSafeCompare(password, trimmedEnv)) {
      passwordValid = true;
      console.log('[KIVO Auth Diagnostic] Notice: Password matched after trimming whitespace from environment variable.');
    } else if (timingSafeCompare(trimmedInput, rawPassword)) {
      passwordValid = true;
      console.log('[KIVO Auth Diagnostic] Notice: Password matched after trimming whitespace from user input.');
    } else if (timingSafeCompare(trimmedInput, trimmedEnv)) {
      passwordValid = true;
      console.log('[KIVO Auth Diagnostic] Notice: Password matched after trimming whitespace from both input and environment variable.');
    }
  }

  if (!usernameValid || !passwordValid) {
    recordFailedAttempt(ip);
    const updated = checkRateLimit(ip);
    const remainingText = updated.remaining > 0 ? ` (${updated.remaining} attempts remaining)` : '';
    console.warn(`[KIVO Auth Diagnostic] ❌ Failed login attempt from IP ${ip}. Invalid credentials.${remainingText}`);
    return { success: false, error: `Invalid admin credentials.${remainingText}`, status: 401 };
  }

  // Credentials valid: reset rate limiter
  resetLoginAttempts(ip);
  console.log(`[KIVO Auth Diagnostic] ✅ Successful admin authentication for user from IP ${ip}`);

  const resolvedUsername = rawUsername.trim();

  // Generate session & CSRF tokens
  const sessionId = crypto.randomBytes(32).toString('hex');
  const signature = signSessionId(sessionId);
  const csrfToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_LIFETIME_MS;

  activeSessions.set(sessionId, {
    username: resolvedUsername,
    csrfToken,
    expiresAt,
  });

  return {
    success: true,
    username: resolvedUsername,
    sessionCookie: `${sessionId}.${signature}`,
    csrfToken,
    expiresAt,
  };
}

// Invalidate session
export function invalidateSession(sessionCookie) {
  if (!sessionCookie) return;
  const [sessionId] = sessionCookie.split('.');
  if (sessionId) {
    activeSessions.delete(sessionId);
  }
}

// Get session from cookie
export function getSession(sessionCookie) {
  if (!sessionCookie || typeof sessionCookie !== 'string') return null;
  const parts = sessionCookie.split('.');
  if (parts.length !== 2) return null;
  const [sessionId, signature] = parts;

  if (!verifySessionSignature(sessionId, signature)) return null;

  const session = activeSessions.get(sessionId);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    activeSessions.delete(sessionId);
    return null;
  }

  return { sessionId, ...session };
}

// Middleware: Require Admin Authentication
export function requireAdminAuth(req, res, next) {
  const sessionCookie = req.cookies?.kivo_admin_session;
  const session = getSession(sessionCookie);

  if (!session) {
    return res.status(401).json({
      error: 'Unauthorized: Admin session is missing or expired.',
      code: 'AUTH_REQUIRED',
    });
  }

  // Attach session to request
  req.adminSession = session;

  // CSRF validation for mutating methods
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const headerCsrf = req.headers['x-csrf-token'];
    if (!headerCsrf || !timingSafeCompare(headerCsrf, session.csrfToken)) {
      return res.status(403).json({
        error: 'Forbidden: Invalid or missing CSRF token.',
        code: 'CSRF_INVALID',
      });
    }
  }

  next();
}

// Periodic cleanup of expired sessions
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of activeSessions.entries()) {
    if (s.expiresAt <= now) {
      activeSessions.delete(id);
    }
  }
}, 60 * 60 * 1000);
