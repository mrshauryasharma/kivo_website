// Production Security Module for KIVO Browser Official Website
// Implements OWASP-compliant security headers, HTTPS enforcement, HSTS,
// access control, rate limiting, CORS restriction, and error shielding.

import path from 'node:path';

// -------------------------------------------------------------
// 1. In-Memory API Rate Limiter
// -------------------------------------------------------------
const rateLimits = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_PUBLIC_API_REQUESTS = 120; // 120 requests/min for public API
const MAX_ADMIN_API_REQUESTS = 60; // 60 requests/min for admin operations

// Cleanup stale IP records every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimits.entries()) {
    if (now - record.resetTime > RATE_LIMIT_WINDOW_MS) {
      rateLimits.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function apiRateLimiter(type = 'public') {
  const maxRequests = type === 'admin' ? MAX_ADMIN_API_REQUESTS : MAX_PUBLIC_API_REQUESTS;

  return (req, res, next) => {
    // Skip static assets
    if (!req.path.startsWith('/api/')) {
      return next();
    }

    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const key = `${type}:${ip}`;
    const now = Date.now();

    let record = rateLimits.get(key);
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS };
      rateLimits.set(key, record);
    } else {
      record.count += 1;
    }

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        error: 'Too many requests. Please slow down and try again shortly.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfterSeconds: retryAfter,
      });
    }

    next();
  };
}

// -------------------------------------------------------------
// 2. HTTPS Enforcement & Security Headers
// -------------------------------------------------------------
export function securityHeaders(req, res, next) {
  const isProduction = process.env.NODE_ENV === 'production';
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const host = req.headers.host || '';

  // Enforce HTTPS in production when not on localhost
  const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  if (isProduction && !isHttps && !isLocalhost) {
    return res.redirect(301, `https://${host}${req.originalUrl}`);
  }

  // HSTS (HTTP Strict Transport Security): 1 year + subdomains + preload
  if (isHttps) {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Content-Security-Policy (CSP) tailored for KIVO website:
  // - Fonts: Google Fonts (fonts.googleapis.com, fonts.gstatic.com)
  // - Scripts: Self-hosted bundled Vite scripts
  // - Styles: Self-hosted + unsafe-inline for Framer Motion dynamic transforms + Google Fonts
  // - Images: Self-hosted logo PNGs, inline data: and blob: SVGs
  // - Framing: Blocked completely (frame-ancestors 'none') to prevent Clickjacking
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; ');

  res.setHeader('Content-Security-Policy', cspDirectives);

  // MIME type sniffing protection
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Clickjacking protection for legacy browsers (superseded by frame-ancestors 'none')
  res.setHeader('X-Frame-Options', 'DENY');

  // Referrer Policy: sends full URL on same-origin, origin only on cross-origin HTTPS, none on downgrade
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy: disable sensitive device APIs
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), vr=(), interest-cohort=()'
  );

  // Modern Cross-Origin Isolations
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  // Modern OWASP recommendation: disable legacy buggy XSS auditor
  res.setHeader('X-XSS-Protection', '0');

  next();
}

// -------------------------------------------------------------
// 3. Block Sensitive Files, Hidden Paths & Directory Traversal
// -------------------------------------------------------------
export function blockRestrictedAccess(req, res, next) {
  const requestPath = decodeURIComponent(req.path);

  // Check 1: Directory traversal attack detection
  if (
    requestPath.includes('..') ||
    requestPath.includes('%2e%2e') ||
    requestPath.includes('\0')
  ) {
    return res.status(400).json({ error: 'Bad Request: Invalid path characters.' });
  }

  // Check 2: Block dotfiles and hidden folders (e.g. .env, .git, .gitignore, .DS_Store)
  if (/(^\/|\/)\.[a-zA-Z0-9_-]/i.test(requestPath)) {
    return res.status(404).send('Not Found');
  }

  // Check 3: Block source map files (*.map)
  if (/\.map$/i.test(requestPath)) {
    return res.status(404).send('Not Found');
  }

  // Check 4: Block private server directories from direct URL access
  if (/(^\/|\/)(server|storage|src|node_modules|logs|test_storage)(\/|$)/i.test(requestPath)) {
    return res.status(404).send('Not Found');
  }

  // Check 5: Block sensitive file extensions (except public assets like .js, .css, .html, .png, .svg)
  // This blocks direct probes for package.json, metadata.json, README.md, tsconfig.json, server.js, etc.
  // Note: Authenticated attachment streams under /api/ are verified and handled by dedicated route controllers.
  if (!requestPath.includes('/attachment/')) {
    const sensitiveExtensions =
      /\.(env|git|bak|backup|old|log|sql|ini|conf|ya?ml|json|ts|tsx|md|sh|bat|cmd|map)$/i;

    if (sensitiveExtensions.test(requestPath)) {
      return res.status(404).send('Not Found');
    }
  }

  next();
}

// -------------------------------------------------------------
// 4. Strict CORS Protection
// -------------------------------------------------------------
export function corsProtection(req, res, next) {
  const origin = req.headers.origin;

  // Same-origin browser requests (e.g. direct clicks, curl, browser address bar) have no Origin header
  if (!origin) {
    return next();
  }

  const host = req.headers.host;
  const isAllowedSameHost =
    origin === `http://${host}` ||
    origin === `https://${host}` ||
    origin.endsWith(`://${host}`);

  // Allow custom trusted origins if provided in environment
  const customOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const isCustomAllowed = customOrigins.includes(origin);

  if (isAllowedSameHost || isCustomAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, X-CSRF-Token, Authorization, Range'
    );
    res.setHeader(
      'Access-Control-Expose-Headers',
      'Content-Range, Content-Length, Content-Disposition, Accept-Ranges'
    );

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    return next();
  }

  // Untrusted cross-origin request to an API endpoint
  if (req.path.startsWith('/api/')) {
    return res.status(403).json({
      error: 'Forbidden: Cross-Origin access rejected by security policy.',
      code: 'CORS_REJECTED',
    });
  }

  next();
}

// -------------------------------------------------------------
// 5. Input Validation Helpers
// -------------------------------------------------------------
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_VERSION_REGEX = /^[0-9a-zA-Z._-]{1,32}$/;

export function validateUploadInitBody(body, platformRules) {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid request payload. Expected JSON object.');
  }

  const { platform, filename, version, totalSize, totalChunks } = body;

  if (!platform || !platformRules[platform]) {
    throw new Error(
      `Invalid platform "${platform}". Must be one of: ${Object.keys(platformRules).join(', ')}`
    );
  }

  if (!filename || typeof filename !== 'string') {
    throw new Error('filename is required and must be a valid string.');
  }

  // Prevent path traversal in filename
  const baseFilename = path.basename(filename);
  if (baseFilename !== filename || filename.includes('/') || filename.includes('\\')) {
    throw new Error('Path separators are not allowed in filename.');
  }

  const ext = path.extname(baseFilename).toLowerCase();
  const rule = platformRules[platform];
  if (!rule.allowedExtensions.includes(ext)) {
    throw new Error(
      `Invalid file extension "${ext}" for ${rule.name}. Only ${rule.allowedExtensions.join(', ')} allowed.`
    );
  }

  if (version && (!SAFE_VERSION_REGEX.test(version) || version.length > 32)) {
    throw new Error('Invalid version string. Max 32 characters (alphanumeric, dot, dash, underscore).');
  }

  const size = parseInt(totalSize, 10);
  if (isNaN(size) || size <= 0) {
    throw new Error('totalSize must be a positive integer.');
  }

  const chunks = parseInt(totalChunks, 10);
  if (isNaN(chunks) || chunks <= 0) {
    throw new Error('totalChunks must be a positive integer.');
  }

  return {
    platform,
    filename: baseFilename,
    version: (version || '1.0.0').trim(),
    totalSize: size,
    totalChunks: chunks,
  };
}

export function validateUploadId(uploadId) {
  if (!uploadId || typeof uploadId !== 'string' || !UUID_REGEX.test(uploadId)) {
    throw new Error('Invalid uploadId parameter. Expected valid UUID format.');
  }
  return uploadId;
}

// -------------------------------------------------------------
// 6. Safe Error Shielding Middleware
// -------------------------------------------------------------
export function safeErrorHandler(err, req, res, _next) {
  // Always log full error details internally on server console
  console.error('[KIVO Security Error Handler]', {
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    message: err.message,
    stack: err.stack,
  });

  const statusCode = typeof err.status === 'number' ? err.status : 500;

  // Never expose raw stack traces, file system paths, or internal errors to users
  res.status(statusCode).json({
    error:
      statusCode >= 500
        ? 'An unexpected internal server error occurred. Please try again later.'
        : err.message || 'Request could not be processed.',
    code: err.code || 'SERVER_ERROR',
  });
}
