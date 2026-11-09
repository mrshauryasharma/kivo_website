import crypto from 'node:crypto';
import {
  getStoredUsers,
  saveStoredUsers,
  findUserByEmail,
  findUserById,
  createUserRecord,
  updateUserRecord,
} from './db.js';
import { sendCustomerEmail } from './email.js';

// In-memory customer session store: Map<sessionId, { userId: string, email: string, expiresAt: number }>
const customerSessions = new Map();

const CUSTOMER_SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Clean up expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [sid, sess] of customerSessions.entries()) {
    if (sess.expiresAt <= now) {
      customerSessions.delete(sid);
    }
  }
}, 60 * 60 * 1000);

// Password hashing using PBKDF2 (100,000 iterations, SHA-512)
export function hashPassword(plainPassword) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(plainPassword, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(plainPassword, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const testHash = crypto.pbkdf2Sync(plainPassword, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(testHash, 'hex'), Buffer.from(originalHash, 'hex'));
}

// Generate secure session ID
function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

// Register new customer
export async function registerCustomer({ name, email, password }) {
  const cleanName = (name || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!cleanName || cleanName.length < 2) {
    throw new Error('Name must be at least 2 characters long.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    throw new Error('A valid email address is required.');
  }

  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }

  // Check if email already exists
  const existing = await findUserByEmail(cleanEmail);
  if (existing) {
    throw new Error('An account with this email address already exists.');
  }

  const passwordHash = hashPassword(password);
  const user = await createUserRecord({
    name: cleanName,
    email: cleanEmail,
    passwordHash,
    status: 'active',
    role: 'customer',
  });

  // Create session
  const sessionId = generateSessionId();
  const expiresAt = Date.now() + CUSTOMER_SESSION_LIFETIME_MS;
  customerSessions.set(sessionId, {
    userId: user.id,
    email: user.email,
    name: user.name,
    expiresAt,
  });

  // Send registration confirmation notification
  try {
    await sendCustomerEmail({
      to: cleanEmail,
      subject: 'Welcome to KIVO Browser — Account Created',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0A0F1D; color: #FFFFFF; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
          <h2 style="color: #00F5FF; margin-top: 0;">Welcome to KIVO, ${cleanName}!</h2>
          <p style="color: #94A3B8; font-size: 14px; line-height: 1.6;">
            Your KIVO customer account has been successfully created. You can now manage your downloads, submit support tickets, and track your account activity.
          </p>
          <div style="margin: 24px 0; padding: 16px; background: rgba(255,255,255,0.04); border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);">
            <p style="margin: 0; font-size: 13px; color: #CBD5E1;"><strong>Registered Email:</strong> ${cleanEmail}</p>
          </div>
          <p style="color: #64748B; font-size: 12px; margin-top: 24px;">
            If you did not create this account, please contact support@kivobrowser.com immediately.
          </p>
        </div>
      `,
      text: `Welcome to KIVO, ${cleanName}! Your account with email ${cleanEmail} has been successfully created.`,
    });
  } catch (err) {
    console.warn('[KIVO Auth] Failed to dispatch welcome email:', err.message);
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    },
    sessionId,
    expiresAt,
  };
}

// Authenticate customer login
export async function loginCustomer({ email, password }) {
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!cleanEmail || !password) {
    throw new Error('Email and password are required.');
  }

  const user = await findUserByEmail(cleanEmail);
  if (!user) {
    throw new Error('Invalid email or password.');
  }

  if (user.status === 'suspended') {
    throw new Error('Your account has been temporarily suspended. Please contact support.');
  }

  const valid = verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new Error('Invalid email or password.');
  }

  // Update last login
  user.lastLoginAt = new Date().toISOString();
  await updateUserRecord(user);

  const sessionId = generateSessionId();
  const expiresAt = Date.now() + CUSTOMER_SESSION_LIFETIME_MS;
  customerSessions.set(sessionId, {
    userId: user.id,
    email: user.email,
    name: user.name,
    expiresAt,
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    },
    sessionId,
    expiresAt,
  };
}

// Invalidate customer session (logout)
export function logoutCustomer(sessionId) {
  if (sessionId && customerSessions.has(sessionId)) {
    customerSessions.delete(sessionId);
    return true;
  }
  return false;
}

// Get customer session from cookie
export async function getCustomerSession(sessionId) {
  if (!sessionId) return null;
  const sess = customerSessions.get(sessionId);
  if (!sess) return null;

  if (Date.now() > sess.expiresAt) {
    customerSessions.delete(sessionId);
    return null;
  }

  const user = await findUserById(sess.userId);
  if (!user || user.status === 'suspended') {
    customerSessions.delete(sessionId);
    return null;
  }

  return {
    sessionId,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    },
  };
}

// Customer Auth Middleware
export async function requireCustomerAuth(req, res, next) {
  const sessionId = req.cookies?.kivo_customer_session;
  const session = await getCustomerSession(sessionId);

  if (!session) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  req.customer = session.user;
  req.customerSessionId = session.sessionId;
  next();
}

// Password Reset Request (Generates 6-digit code or secure token)
export async function requestPasswordReset(email) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const user = await findUserByEmail(cleanEmail);

  // Return success even if user not found to prevent email enumeration
  if (!user) {
    return { success: true, message: 'If an account exists, a password reset link has been sent.' };
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const tokenExpiresAt = Date.now() + 60 * 60 * 1000; // 1 hour

  user.resetToken = resetToken;
  user.resetTokenExpiresAt = tokenExpiresAt;
  await updateUserRecord(user);

  try {
    await sendCustomerEmail({
      to: cleanEmail,
      subject: 'KIVO Browser — Reset Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0A0F1D; color: #FFFFFF; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
          <h2 style="color: #00F5FF; margin-top: 0;">Password Reset Request</h2>
          <p style="color: #94A3B8; font-size: 14px; line-height: 1.6;">
            We received a request to reset the password for your KIVO customer account. Click the button below or copy the reset code to continue:
          </p>
          <div style="margin: 24px 0; text-align: center;">
            <a href="https://kivobrowser.com/?action=reset-password&token=${resetToken}" style="display: inline-block; background: linear-gradient(135deg, #00F5FF, #7928CA); color: #000; font-weight: bold; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px;">
              Reset Password
            </a>
          </div>
          <div style="margin: 20px 0; padding: 12px; background: rgba(255,255,255,0.04); border-radius: 6px; font-family: monospace; font-size: 12px; color: #CBD5E1; word-break: break-all;">
            Token: ${resetToken}
          </div>
          <p style="color: #64748B; font-size: 12px; margin-top: 24px;">
            This link is valid for 1 hour. If you did not request this, you can safely ignore this email.
          </p>
        </div>
      `,
      text: `Reset your KIVO password: https://kivobrowser.com/?action=reset-password&token=${resetToken}`,
    });
  } catch (err) {
    console.warn('[KIVO Auth] Failed to dispatch password reset email:', err.message);
  }

  return { success: true, message: 'If an account exists, a password reset link has been sent.' };
}

// Complete Password Reset
export async function resetPassword({ token, newPassword }) {
  if (!token || !newPassword || newPassword.length < 8) {
    throw new Error('Valid reset token and a new password with at least 8 characters are required.');
  }

  const users = await getStoredUsers();
  const user = users.find((u) => u.resetToken === token && u.resetTokenExpiresAt > Date.now());

  if (!user) {
    throw new Error('Invalid or expired password reset token.');
  }

  user.passwordHash = hashPassword(newPassword);
  user.resetToken = null;
  user.resetTokenExpiresAt = null;
  await updateUserRecord(user);

  return { success: true, message: 'Password has been successfully updated. You may now sign in.' };
}
