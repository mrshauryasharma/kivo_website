# KIVO Website — Antigravity Engineering, Architecture & Integration Guidelines

This project (`E:\Kivo_Website`) is configured to leverage Antigravity's global integrations, installed MCP servers, specialist subagents, and engineering skill vault.

---

## 1. Project Architecture & Conventions

### Technology Stack
- **Frontend:** React 19, TypeScript, Vite 8 (Rolldown), Tailwind CSS, Framer Motion, Lucide React.
- **Backend:** Node.js (>= 20.0.0 LTS, v24 LTS in dev), Express 5, `cookie-parser`, `compression`.
- **Database Architecture:** Dual-layer persistence:
  - MySQL / MariaDB via `mysql2` connection pooling (cPanel production).
  - Atomic JSON persistence (`server/db.js`) as local fallback.
- **Storage:** Persistent filesystem storage for installers (`KIVO_STORAGE_PATH`) with SHA-256 checksum integrity validation and Boot Reconciliation.
- **Email:** Resend REST API for support notifications, ticket tracking OTPs, and release alerts.

### Directory Structure & Module Boundaries
- `server.js`: Web server entry point, security middleware pipeline, graceful shutdown, SPA routing fallback.
- `server/`: Dedicated controllers and services:
  - `auth.js`: Admin authentication, HMAC session signing, CSRF protection.
  - `chunkedUpload.js`: Large installer uploads with SHA-256 assembly.
  - `cms.js`: Headless CMS content management.
  - `config.js`: Centralized configuration, storage discovery, platform rules.
  - `customerAuth.js`: Customer account authentication with PBKDF2 hashing.
  - `db.js`: Unified data layer for MySQL and atomic JSON.
  - `email.js`: Resend integration with HTML email templates.
  - `installers.js`: Metadata, active installer verification, permanent retention.
  - `mysql.js`: MySQL connection pool, health check, schema initialization.
  - `security.js`: Rate limiters, CSP, path traversal defense, error shielding.
  - `tickets.js`: Customer support ticket lifecycle and 2FA OTP tracking.
- `src/`: Client React SPA:
  - `components/`: Modular presentation and interactive elements.
  - `components/admin/`: Admin control panel tabs.
  - `context/`: React context providers (CMS, theme).
  - `types/`: Shared TypeScript definitions.
- `tests/`: Automated unit and API tests powered by `node:test`.

---

## 2. Standard Development, Build & Test Commands

Always verify changes using project-native tools:
```bash
# Install dependencies
npm ci

# Start development server
npm run dev

# Run code linter
npm run lint

# Run type check & production build
npm run build

# Run automated test suite
npm test

# Launch production server
npm start
```

---

## 3. Integration Discovery & Selection Rules

Before executing any development or review task:
1. **Pre-Task Check:** Discover installed plugins, MCP servers, and available skills.
2. **Dynamic Skill & Agent Mapping:**
   - Architecture & module design: Activate `architecture-patterns` / `architecture-design` or delegate to `dev-architect`.
   - Incremental multi-file implementation: Activate `incremental-implementation`.
   - Bug investigation & error recovery: Follow the Stop-the-Line rule via `debugging-and-error-recovery` / `systematic-debugging`.
   - Behavior changes & test additions: Activate `test-driven-development` / `test-automation-tdd` or delegate to `qa-engineer`.
   - Security auditing & input hardening: Activate `security-and-hardening` / `appsec-vulnerability-hardening` or delegate to `security-reviewer`.
   - PR reviews & code quality: Activate `code-review` / `autofix` via CodeRabbit.
   - Database / Firestore rules: Delegate to `firestore-rules-author`.

### Automatic Integration Selection Matrix:
- **GitHub**: Repository state, branch checkout, atomic conventional commits (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`), PR creation.
- **Database (MySQL / Supabase / Firebase)**: Use parameterized queries, defense-in-depth, strict validation, zero SQL injection.
- **UI & Design (Figma)**: Follow design specifications, tokens, dark theme gradients, and responsive breakpoints.
- **Testing & Browser Automation (Chrome DevTools / Playwright)**: Use for E2E validation, a11y compliance, memory leak checks, and LCP debugging.
- **Hosting & Deployment (GoDaddy / Vercel)**: Inspect deployment history, preview builds, environment secrets, and live health status.
- **Multi-Integration Orchestration**: Combine tools systematically (e.g. Design → Implement → Test → Security Review → Verify). Avoid unrelated or speculative tool calls.

---

## 4. Security & Production Safety Requirements

1. **Zero Secret Exposure**: Never print, log, or commit passwords, API keys (Resend, GoDaddy PAT, MySQL), or JWT secrets. Use `.env.example` with safe placeholders only.
2. **Strict Retention Policy**: Completed desktop installer files (Windows EXE, macOS DMG, Android APK) have permanent retention and must NEVER be deleted automatically by TTL or cron routines. Manual deletion requires authorized admin credentials.
3. **No-Deployment Without Approval**: Never deploy to production, push commits to remote, or alter live infrastructure without explicit user approval.
4. **Input Boundaries & Defense-in-Depth**: Treat all HTTP inputs (headers, cookies, query params, payloads) as untrusted. Validate paths to prevent directory traversal.
5. **Anti-Caching for Sensitive Routes**: Always set `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, private` on administrative and customer support routes.
6. **Graceful Resource Handling**: Background `setInterval` timers must call `.unref()` to avoid holding the Node.js event loop open during tests and shutdowns.
