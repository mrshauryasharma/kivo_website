import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const distPath = path.join(__dirname, 'dist');
const indexPath = path.join(distPath, 'index.html');

// Validate dist build exists
if (!fs.existsSync(distPath) || !fs.existsSync(indexPath)) {
  console.warn(
    'WARNING: dist folder or index.html not found! Make sure to run "npm run build" before starting the server.'
  );
}

// Health check endpoint for GoDaddy deployment / load balancer monitors
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    app: 'KIVO Browser Official Website',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

// Serve static assets with caching for hashed files
app.use(
  express.static(distPath, {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
      // Aggressive caching for hashed assets in assets/
      if (filePath.includes(path.sep + 'assets' + path.sep)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (filePath.endsWith('.html')) {
        // Never cache HTML so updates are immediate
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    },
  })
);

// SPA fallback: any route not matching a static file returns index.html
app.use((req, res) => {
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Application build not found. Please run npm run build.');
  }
});

app.listen(PORT, () => {
  console.log(`[KIVO Web Server] Listening on port ${PORT}`);
  console.log(`[KIVO Web Server] Serving static files from: ${distPath}`);
});
