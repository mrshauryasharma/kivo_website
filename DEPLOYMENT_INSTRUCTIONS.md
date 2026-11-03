# KIVO Browser Official Website & Admin Panel Deployment Guide

This guide covers deploying the KIVO Browser website and its secure `/kivoadmin` installer management portal to **GoDaddy Node.js Hosting** (or any Node.js 18+ / 20+ / 22+ hosting platform).

---

## 1. Architecture Overview

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS + Framer Motion.
- **Backend:** Node.js Express server (`server.js`) with native ES Modules (`type: "module"`).
- **Public Routes:**
  - `/` : Full interactive KIVO Browser official website with mouse cursor effects and live download buttons.
  - `/api/downloads/status` : Public JSON API reporting availability, version, file size, and download URLs for Windows, macOS Apple Silicon, and macOS Intel installers.
  - `/api/download/:platform` : Direct streaming installer download endpoint with HTTP Range support for resumable browser downloads.
- **Admin Portal (`/kivoadmin`):**
  - Secured via HttpOnly sessions, CSRF token validation, constant-time password verification, and brute-force rate limiting (max 5 failed attempts per 15 minutes).
  - 5 MB chunked upload system supporting up to 2 GB installer files (`.exe`, `.dmg`) without hitting reverse proxy payload limits.
  - Incremental SHA-256 verification and atomic file assembly.
  - Delete and replace workflows for all 3 supported desktop platforms.

---

## 2. Environment Variables Configuration

Configure these environment variables in your GoDaddy Node.js Hosting control panel (under **Environment Variables** or **App Configuration**):

| Variable Name | Required | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | Auto / Required | GoDaddy assigned | The TCP port the server listens on (automatically injected by GoDaddy). |
| `NODE_ENV` | Optional | `production` | Set to `production` for secure cookie transmission. |
| `KIVO_ADMIN_USERNAME` | **Required** | `None` (must be set) | The username required to log into `/kivoadmin` (e.g. `kivoadminshaurya`). |
| `KIVO_ADMIN_PASSWORD` | **Required** | `None` (must be set) | **Your secret admin password**. Configure securely in hosting environment secrets. |
| `SESSION_SECRET` | Optional / Recommended | Auto fallback | Secret key (32+ characters) used to cryptographically sign session tokens and CSRF cookies. |
| `UPLOADS_DIR` | Optional / Recommended | `./storage/installers` | **Persistent disk directory** outside the temporary app deployment root (e.g., `/home/<username>/kivo_storage/installers`) so new code redeployments never delete uploaded installers. |

> ⚠️ **Persistent Storage Tip:** On GoDaddy Node.js Apps, redeploying from a ZIP or Git repository may wipe the current project directory. Setting `UPLOADS_DIR` to a path outside the app folder ensures that your uploaded `.exe` and `.dmg` installers remain safe forever across redeployments.

---

## 3. GoDaddy Node.js Hosting Settings

When creating or configuring your Node.js application in GoDaddy:

- **Node.js Version:** `Node.js 20.x` or `Node.js 22.x`
- **Application Root:** Application directory where the files are extracted.
- **Application Startup File:** `server.js`
- **Build Command:** `npm run build`
- **Start Command:** `npm start` (runs `node server.js`)
- **Package Manager:** `npm`

---

## 4. Deployment Steps

### Option A: Upload Deployment ZIP

1. Download or locate `kivo-website-godaddy-deploy.zip`.
2. In GoDaddy Hosting cPanel / Cloud Console, navigate to **Node.js Apps**.
3. Upload and extract `kivo-website-godaddy-deploy.zip`.
4. Click **Run NPM Install** (or run `npm install --omit=dev`).
5. Run the build step if necessary (`npm run build`). Note: The pre-compiled production `dist` directory is already included in the ZIP.
6. Set your environment variables (`ADMIN_PASSWORD`, `SESSION_SECRET`, `UPLOADS_DIR`).
7. Click **Restart Application** or **Start Application**.
8. Visit your domain:
   - Official Website: `https://yourdomain.com/`
   - Admin Portal: `https://yourdomain.com/kivoadmin`

### Option B: Deploy via Git Repository

1. Push this repository to your private GitHub repo.
2. Link the repository to your GoDaddy / Cloud hosting platform.
3. Configure Environment Variables in the platform dashboard.
4. Trigger the build and deploy.

---

## 5. How to Use the Admin Portal (`/kivoadmin`)

1. Open your browser and navigate to `https://yourdomain.com/kivoadmin`.
2. Sign in with:
   - **Username:** `kivoadminshaurya` (or your configured `KIVO_ADMIN_USERNAME`)
   - **Password:** Your configured `KIVO_ADMIN_PASSWORD`
3. In the Release Management Dashboard:
   - Set the release version (e.g. `1.0.0`).
   - Select or drag-and-drop the installer:
     - **Windows (.exe)**
     - **macOS Apple Silicon (.dmg)**
     - **macOS Intel (.dmg)**
   - Monitor the live chunked upload progress bar (supports files up to 2 GB).
   - Once complete, verify the generated SHA-256 integrity hash.
4. The main website download buttons will automatically activate for your users!

---

## 6. Production Security Architecture

The application has been hardened with OWASP-aligned production security:

### Implemented Protections
- **HTTPS & HSTS:** Automatic 301 redirection to HTTPS in production; HSTS header (`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`).
- **Content Security Policy (CSP):** Restricts script execution to self, enforces Google Fonts whitelisting, prevents object/plugin execution, and enforces `frame-ancestors 'none'` to eliminate clickjacking.
- **MIME & Browser Protections:** `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `X-XSS-Protection: 0`, `Permissions-Policy`.
- **Server Identity Masking:** `X-Powered-By` header disabled; sanitized health check endpoint at `/health` with no system paths or internals.
- **Directory Listing Disabled:** Subdirectory browsing is disabled; requests for missing file extensions return HTTP 404 rather than leaking directory indexes or returning HTML.
- **Access Control & Path Traversal Block:** Rejects dotfiles (`.env`, `.git`), source maps (`*.map`), private server files (`server.js`, `package.json`, `tsconfig.json`), and private folders (`/server/`, `/storage/`, `/src/`).
- **CORS Restriction:** Cross-origin API access from untrusted external domains is blocked with HTTP 403.
- **Rate Limiting:** Public API limited to 120 req/min; Admin API limited to 60 req/min; Login strictly limited to 5 failed attempts per 15 mins.
- **Source Maps Disabled:** `build.sourcemap: false` configured in Vite build; no `.map` files are generated or publicly served.
- **Error Shielding:** Global error handler catches unexpected exceptions and suppresses internal paths or stack traces from visitors.

### Transparent Security Disclosure
- **What is protected:** All backend logic, admin authentication secrets, session tokens, CSRF validation, raw installer storage, and private server files are strictly protected on the server.
- **What cannot be hidden:** In any web application, production client-side HTML, CSS, bundled JavaScript, and static assets delivered to a visitor's browser are executed and interpreted by the browser engine and can be inspected via Browser Developer Tools. No sensitive credentials, private keys, or admin tokens exist in the client-side JavaScript.
