# KIVO Browser — Official Website

> **Browse Freely.**  
> A modern, privacy-focused desktop web browser for Windows and macOS.

Official repository for the KIVO Browser website.

---

## 🚀 Features & Architecture

- **Framework:** React 19 + TypeScript
- **Styling:** Tailwind CSS + custom dark glassmorphism palette
- **Animations:** Framer Motion (respects reduced-motion preferences)
- **Icons:** Lucide React
- **Custom Cursor:** Smooth 60 FPS interpolated follower ring with fine-pointer detection
- **Backend / Deployment:** Production-ready `server.js` with SPA fallback & dynamic port binding

---

## 🛠️ Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Production Build
```bash
npm run build
```

### 4. Start Production Server
```bash
npm start
```

---

## 📁 Project Structure

```
├── public/                 # Static assets (logo, favicons)
├── src/
│   ├── assets/             # Brand logos & imagery
│   ├── components/         # Modular React components
│   │   ├── Navbar.tsx
│   │   ├── Hero.tsx
│   │   ├── Features.tsx
│   │   ├── PrivacySection.tsx
│   │   ├── BrowserShowcase.tsx
│   │   ├── DownloadSection.tsx
│   │   ├── AboutSection.tsx
│   │   ├── Footer.tsx
│   │   ├── CustomCursor.tsx
│   │   ├── MagneticButton.tsx
│   │   ├── EarlyAccessModal.tsx
│   │   └── LegalModal.tsx
│   ├── config/             # Centralized download configuration
│   ├── App.tsx             # Root application
│   └── index.css           # Custom utilities & Tailwind directives
├── index.html              # HTML entry point with SEO metadata
├── server.js               # Node.js Express production server
└── vite.config.ts          # Vite configuration
```

---

## 📄 License
© 2026 KIVO Browser. All rights reserved.
