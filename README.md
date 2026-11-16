# KIVO Browser — Official Web Platform & Distribution Engine

<div align="center">

![KIVO Logo](public/kivo-logo.png)

### **Browse Freely.**
*A modern, privacy-first web browser engineered for Android, Windows, and macOS.*

[![Node.js CI](https://github.com/mrshauryasharma/kivo_website/actions/workflows/ci.yml/badge.svg)](https://github.com/mrshauryasharma/kivo_website/actions)
[![License: Proprietary EULA](https://img.shields.io/badge/License-EULA%20%26%20Proprietary-blue.svg)](LICENSE)
[![Security: RFC 9116](https://img.shields.io/badge/Security-RFC%209116%20Compliant-emerald.svg)](public/.well-known/security.txt)
[![Node Version](https://img.shields.io/badge/Node.js-%3E%3D20.0.0-green.svg)](https://nodejs.org)

</div>

---

## 📖 Overview

The **KIVO Web Platform** serves as the central distribution portal, administrative control plane, customer support desk, and release management system for the KIVO Browser. Engineered with extreme performance, strict client-side data sovereignty, and defense-in-depth security, it provides an ultra-fast experience both online and offline.

---

## ⚡ Architecture & Technology Stack

### **Frontend Client**
- **Framework:** React 19 + TypeScript
- **Bundler:** Vite 8 (Rolldown engine)
- **Styling:** Tailwind CSS + Custom Dark Glassmorphism Design System
- **Motion & Interactions:** Framer Motion (reduced-motion accessible)
- **Icons:** Lucide React
- **Offline / PWA:** Service Worker (`sw.js`) with cache-first static asset delivery & background sync

### **Backend Server & APIs**
- **Runtime:** Node.js (>= 20.0.0 LTS)
- **Web Framework:** Express 5 (HTTP/2 ready, gzip/deflate response compression)
- **Database Architecture (Dual Layer):**
  - **Layer A (MySQL/MariaDB):** cPanel/Managed MySQL connection pool (`mysql2`) storing installer metadata, customer tickets, CMS revisions, and binary chunk recovery tables.
  - **Layer B (Atomic Persistent JSON):** Fast, crash-safe local fallback and bootstrap storage.
- **Binary Storage:** Resilient outside-repo filesystem storage (`KIVO_STORAGE_PATH`) with SHA-256 integrity validation and boot reconciliation.
- **Email Delivery:** Resend REST API for customer ticket confirmations, admin replies, and platform launch alerts.

---

## 🛡️ Security, Privacy & Compliance

- **Zero Behavioral Surveillance:** No Google Analytics, no Facebook Pixels, no third-party tracking scripts.
- **RFC 9116 `security.txt`:** Fully compliant security disclosure policy hosted at `/.well-known/security.txt`.
- **Granular Cookie Consent:** GDPR & ePrivacy compliant floating consent manager allowing users to select Essential, Performance, and Functional cookies.
- **OWASP Hardened Headers:**
  - Strict Content Security Policy (CSP)
  - HTTP Strict Transport Security (HSTS) with 1-year preload
  - `X-Frame-Options: DENY` (Anti-Clickjacking)
  - `X-Content-Type-Options: nosniff` (MIME sniffing prevention)
  - `X-Permitted-Cross-Domain-Policies: none`
  - Anti-caching headers on all sensitive administrative and support ticket routes
- **CSRF & Session Defense:** Timing-safe cryptographic HMAC-SHA256 session signatures and mandatory CSRF token verification for all mutations.
- **Rate Limiting:** Dedicated in-memory sliding window rate limiters for public endpoints, administrative logins, and support OTP verification.
- **Graceful Shutdown:** Handles `SIGTERM` and `SIGINT` cleanly, draining HTTP connections and gracefully closing MySQL connection pools.

---

## 📁 Repository Directory Structure

```
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions CI/CD pipeline
├── public/                      # Static web assets & icons
│   ├── .well-known/
│   │   └── security.txt         # RFC 9116 Security & Vulnerability Policy
│   ├── kivo-logo.png
│   ├── manifest.webmanifest     # Web App Manifest
│   └── sw.js                    # Service Worker (Offline caching engine)
├── server/                      # Backend application modules
│   ├── auth.js                  # Admin authentication & session security
│   ├── chunkedUpload.js         # Resilient chunked installer upload engine
│   ├── cms.js                   # Headless CMS content controller
│   ├── config.js                # Environment config, platform rules & storage paths
│   ├── customerAuth.js          # Customer authentication & PBKDF2 hashing
│   ├── db.js                    # Database abstraction layer (MySQL + JSON sync)
│   ├── email.js                 # Resend API integration & email templates
│   ├── installers.js            # Installer metadata & binary reconciliation
│   ├── migrate.js               # Safe database migration engine
│   ├── mysql.js                 # MySQL connection pooling & schema management
│   ├── security.js              # CSP, rate limiting, and input sanitizers
│   ├── storageMonitor.js        # Disk space monitoring & storage health
│   └── tickets.js               # Customer support ticketing controller
├── src/                         # Frontend React 19 source code
│   ├── assets/                  # Brand assets & logos
│   ├── components/              # Modular UI components
│   │   ├── admin/               # Administrative portal tabs
│   │   ├── CookieConsentBanner.tsx # Interactive privacy consent manager
│   │   ├── DownloadSection.tsx  # Download cards (Android, Windows, macOS)
│   │   ├── LegalModal.tsx       # Privacy, Terms, Cookies, License, Security modal
│   │   ├── SupportModal.tsx     # Customer support modal & problem submission
│   │   └── TicketTrackingPortal.tsx # Customer ticket tracking & 2FA verification
│   ├── context/                 # React Context providers (CMS Context)
│   ├── types/                   # TypeScript interfaces
│   ├── App.tsx                  # Root client application & SPA routing
│   └── main.tsx                 # Client entry point
├── tests/                       # Automated test suite (node:test)
│   ├── api.test.mjs             # HTTP endpoint & security header tests
│   ├── config.test.mjs          # Configuration & platform rules tests
│   └── security.test.mjs        # Input sanitization & traversal defense tests
├── .env.example                 # Safe environment configuration template
├── .gitignore                   # Version control ignore rules
├── Dockerfile                   # Multi-stage hardened production container
├── docker-compose.yml           # Local & server container orchestration
├── LICENSE                      # Official KIVO EULA & Software License
├── package.json                 # Project dependencies & scripts
├── server.js                    # Main Node.js production server entry point
├── tailwind.config.js           # Tailwind CSS theme configuration
└── vite.config.ts               # Vite build configuration
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js:** v20.0.0 or higher (v22 LTS recommended)
- **npm:** v10.0.0 or higher
- Optional: MySQL / MariaDB server (defaults to atomic local database if not configured)

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/mrshauryasharma/kivo_website.git
cd kivo_website
npm ci
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and fill in your settings:
```bash
cp .env.example .env
```
*(See `.env.example` for detailed documentation of all variables).*

### 3. Development Mode
Run the Vite development server with hot-module replacement (HMR):
```bash
npm run dev
```

### 4. Running Tests & Quality Checks
Run the automated test suite and fast linter:
```bash
# Run unit & integration tests
npm test

# Run code linter
npm run lint
```

### 5. Production Build & Start
Compile the TypeScript and Vite frontend, then launch the production Express server:
```bash
# Build production bundle
npm run build

# Start production server
npm start
```
The application will be accessible at `http://localhost:3000`.

---

## 🐳 Docker Deployment

Build and run using Docker or Docker Compose:

### Using Docker Compose
```bash
docker compose up -d --build
```

### Using Plain Docker
```bash
# Build image
docker build -t kivo-website:latest .

# Run container
docker run -d \
  -p 3000:3000 \
  --name kivo-web \
  --env-file .env \
  -v kivo_data:/app/persistent_data \
  kivo-website:latest
```

---

## 📡 API Reference Summary

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/health` | Server health check | Public |
| `GET` | `/.well-known/security.txt` | RFC 9116 Security Policy | Public |
| `GET` | `/LICENSE` | Official Software License & EULA | Public |
| `GET` | `/api/downloads/status` | Active verified installer status | Public |
| `GET` | `/api/download/:platform` | Stream installer binary with resume support | Public |
| `POST` | `/api/support/ticket` | Submit new customer support ticket | Public |
| `POST` | `/api/support/track/request-otp` | Request 2FA OTP code for ticket tracking | Public (Rate Limited) |
| `POST` | `/api/support/track/verify` | Verify OTP code and retrieve access token | Public (Rate Limited) |
| `GET` | `/api/support/ticket/:id` | View ticket details & reply history | Customer Token / Admin |
| `POST` | `/api/admin/login` | Authenticate administrative session | Public (Rate Limited) |
| `GET` | `/api/admin/me` | Check active admin session | Admin Auth |
| `GET` | `/api/admin/tickets` | List and filter customer tickets | Admin Auth |
| `POST` | `/api/admin/upload/init` | Initialize chunked binary installer upload | Admin Auth |

---

## 📄 License & Intellectual Property

Copyright &copy; 2026 **KIVO Browser Technologies & Shaurya Sharma**. All Rights Reserved.  
Software releases and distribution are governed by the [KIVO End User License Agreement (EULA)](LICENSE).
