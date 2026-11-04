# KIVO Browser Official Website, Full CMS & Support System Deployment Guide

This guide covers deploying the KIVO Browser website, its **Website CMS**, **Customer Support Ticket System**, **Resend Email Integration**, and **Persistent Binary Storage** to **GoDaddy Node.js Hosting** (or any Node.js 20+ / 22+ hosting platform).

---

## 1. Architecture Overview

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS + Framer Motion.
  - Zero-hardcode content layer: dynamic CMS consumer with 100% graceful fallback to built-in copy.
  - Interactive "Contact & Support / Report Problem" modal dialog with attachments up to 10MB.
  - Dynamic maintenance and announcement notice bar.
- **Backend:** Node.js Express server (`server.js`) with native ES Modules (`type: "module"`).
- **Persistent Storage & Embedded DB:**
  - Zero-native-dependency atomic JSON/WAL database engine (`server/db.js`).
  - Auto-migrating directory resolver: checks `process.env.UPLOADS_DIR`, GoDaddy persistent user home directory, or `public/assets/installers`.
  - Atomic installer binary replacement: streams into `.assembling`, validates size and SHA-256 before swapping, and creates rollback backups.
- **Email Delivery (Resend API):**
  - Uses native Node.js fetch with `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `SUPPORT_NOTIFICATION_EMAIL`.
  - Branded customer ticket confirmation emails, admin support notifications, and threaded admin reply emails.
  - Graceful fallback: If Resend is unconfigured or fails, all tickets and replies are safely logged locally without disrupting operations.
- **Public Routes:**
  - `/` : Full interactive KIVO Browser website.
  - `/api/content` : Public published website CMS copy.
  - `/api/support/ticket` : Public customer support inquiry & problem report submission.
  - `/api/downloads/status` : Public status for Windows, macOS Apple Silicon, and macOS Intel installers.
  - `/api/download/:platform` : Direct streaming installer download endpoint with HTTP 206 Range support.
- **Admin Portal (`/kivoadmin`):**
  - Multi-tab management: **Installers & Storage**, **Website CMS**, and **Support Tickets**.
  - Secured via HttpOnly sessions, CSRF token validation, constant-time password verification, and brute-force rate limiting.

---

## 2. Environment Variables Configuration

Configure these environment variables in your GoDaddy Node.js Hosting control panel (under **Environment Variables** or **App Configuration**):

| Variable Name | Required | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | Auto / Required | GoDaddy assigned | The TCP port the server listens on (e.g. `3000`, dynamically set by hosting). |
| `NODE_ENV` | Optional | `production` | Set to `production` for secure cookie transmission. |
| `KIVO_ADMIN_USERNAME` | Optional | `kivoadminshaurya` | The username required to log into `/kivoadmin`. |
| `KIVO_ADMIN_PASSWORD` | **Required Secret** | `None` (must be set) | **Your secret admin password**. Configure securely in GoDaddy environment secrets. |
| `SESSION_SECRET` | Optional / Recommended | Auto fallback | Secret key (32+ chars) used to sign session cookies and CSRF tokens. |
| `UPLOADS_DIR` | Optional / Recommended | Persistent home or `./public/assets/installers` | **Persistent disk directory for installers** outside temporary code deploy roots (e.g. `/home/<username>/kivo_storage/installers`). |
| `DATA_DIR` | Optional / Recommended | Persistent home or `./public/assets/data` | **Persistent disk directory for database** (CMS content, tickets, and metadata). |
| `RESEND_API_KEY` | Optional / Recommended | `None` | Official Resend API Key (`re_...`) for automatic email delivery. |
| `RESEND_FROM_EMAIL` | Optional | `KIVO Support <onboarding@resend.dev>` | The "From" email address configured on Resend (e.g., `support@kivobrowser.com`). |
| `SUPPORT_NOTIFICATION_EMAIL` | Optional | `support@kivobrowser.com` | Internal mailbox where notifications for incoming customer tickets are sent. |

> 💡 **Persistent Storage on GoDaddy Node.js Hosting:**
> When GoDaddy deploys new application code from Git or a ZIP file, the code directory is extracted fresh. To ensure your installer binaries and tickets persist indefinitely:
> 1. Set `UPLOADS_DIR=/home/<your-godaddy-username>/kivo_storage/installers`
> 2. Set `DATA_DIR=/home/<your-godaddy-username>/kivo_storage/data`
> The server will automatically create these folders and maintain all files across any number of code redeployments!

---

## 3. GoDaddy Node.js Hosting Settings

When creating or configuring your Node.js application in GoDaddy:

- **Node.js Version:** `Node.js 20.x` or `Node.js 22.x`
- **Application Startup File:** `server.js`
- **Build Command:** `npm run build`
- **Start Command:** `npm start` (runs `node server.js`)
- **Package Manager:** `npm`

---

## 4. Deployment Steps

### Option A: Upload Deployment ZIP

1. Download or locate `E:\Kivo_Website_Deployment\kivo-website-godaddy-deploy.zip`.
2. In GoDaddy Hosting cPanel / Cloud Console, navigate to **Node.js Apps**.
3. Upload and extract `kivo-website-godaddy-deploy.zip`.
4. Click **Run NPM Install** (or run `npm install --omit=dev`).
5. Set your environment variables (`KIVO_ADMIN_PASSWORD`, `UPLOADS_DIR`, `RESEND_API_KEY`).
6. Click **Restart Application** or **Start Application**.
7. Visit your domain:
   - Official Website: `https://yourdomain.com/`
   - Admin Portal: `https://yourdomain.com/kivoadmin`

### Option B: Deploy via GitHub Repository

1. Push your updated code to `https://github.com/mrshauryasharma/kivo_website`.
2. Connect your GoDaddy application to the repository.
3. Configure the environment variables in GoDaddy.
4. Deploy the main branch.

---

## 5. Verification & Testing

To run the full automated verification test suite locally or on the server:

```bash
node test_cms_tickets_e2e.mjs
```

This verifies:
1. Server health and CORS security.
2. Public CMS content retrieval.
3. Customer support ticket submission with base64 attachment validation.
4. Admin authentication and brute-force rate limiting.
5. Ticket listing, search, status updating, internal staff notes, and attachment download.
6. CMS Draft creation, draft isolation, live publishing, and revision reversion.
7. Chunked resumable installer upload, SHA-256 verification, and atomic file replacement.
8. Single-click download debouncing and streaming.
