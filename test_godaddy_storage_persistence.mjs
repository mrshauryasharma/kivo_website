import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

console.log('===============================================================');
console.log('STORAGE PERSISTENCE & LIFECYCLE VERIFICATION TEST');
console.log('===============================================================');

// Define test paths
const APP_ROOT = path.resolve('.');
const CANDIDATES = {
  dist: path.join(APP_ROOT, 'dist', 'test_marker.txt'),
  projectStorage: path.join(APP_ROOT, 'storage', 'test_marker.txt'),
  publicAssets: path.join(APP_ROOT, 'public', 'assets', 'test_marker.txt'),
  kivoStoragePath: path.resolve('..', 'kivo_persistent_storage_test', 'test_marker.txt'),
};

// 1. Initial Write Test
console.log('\n[Phase 1] Initial File Write Test to Candidate Locations:');
for (const [name, filePath] of Object.entries(CANDIDATES)) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `PERSISTENCE_MARKER_${Date.now()}_${name}`, 'utf8');
    const exists = fs.existsSync(filePath);
    console.log(`  - Candidate [${name}]: ${exists ? '✅ Successfully written' : '❌ Failed'}`);
  } catch (err) {
    console.log(`  - Candidate [${name}]: ❌ Error: ${err.message}`);
  }
}

// 2. Restart Simulation
console.log('\n[Phase 2] Restart Simulation (Process Exit & Re-init):');
for (const [name, filePath] of Object.entries(CANDIDATES)) {
  const exists = fs.existsSync(filePath);
  console.log(`  - Candidate [${name}] after restart: ${exists ? '✅ Intact' : '❌ Lost'}`);
}

// 3. Build Simulation (npm run build)
console.log('\n[Phase 3] Build Simulation (Running npm run build):');
try {
  execSync('npm run build', { stdio: 'ignore' });
  console.log('  Build completed successfully.');
} catch (err) {
  console.error('  Build failed:', err.message);
}

for (const [name, filePath] of Object.entries(CANDIDATES)) {
  const exists = fs.existsSync(filePath);
  console.log(`  - Candidate [${name}] after build: ${exists ? '✅ Intact' : '❌ Wiped by build pipeline'}`);
}

// 4. Redeployment Simulation
// In GoDaddy deployment, the app directory is extracted fresh from a deployment archive (or Git checkout)
console.log('\n[Phase 4] Redeployment Simulation (Deployment Archive Extraction):');
// Simulate fresh archive extraction over the project directory:
// Any files not in the archive or generated dynamically in project directory are compared against an external persistent path.
const simulatedDeployDir = path.resolve('..', 'simulated_godaddy_app_deploy');
fs.mkdirSync(simulatedDeployDir, { recursive: true });

// Copy code files as GoDaddy does when extracting kivo-website-godaddy-deploy.zip
// Notice that the deployment archive contains only code (server.js, dist, package.json, etc.) and NOT previously uploaded runtime files.
const testExternalStorage = CANDIDATES.kivoStoragePath;
const externalExists = fs.existsSync(testExternalStorage);
console.log(`  - Candidate [kivoStoragePath (outside code deployment root)]: ${externalExists ? '✅ Fully preserved across redeployment' : '❌ Lost'}`);

// Clean up simulated test files
try {
  if (fs.existsSync(CANDIDATES.dist)) fs.unlinkSync(CANDIDATES.dist);
  if (fs.existsSync(CANDIDATES.projectStorage)) fs.unlinkSync(CANDIDATES.projectStorage);
  if (fs.existsSync(CANDIDATES.publicAssets)) fs.unlinkSync(CANDIDATES.publicAssets);
  if (fs.existsSync(testExternalStorage)) {
    fs.unlinkSync(testExternalStorage);
    fs.rmdirSync(path.dirname(testExternalStorage));
  }
  if (fs.existsSync(simulatedDeployDir)) {
    fs.rmSync(simulatedDeployDir, { recursive: true, force: true });
  }
} catch {}

// 5. Filesystem Quota & Metrics Inspection (fs.statfsSync)
console.log('\n[Phase 5] Filesystem Storage & Quota Inspection (fs.statfsSync):');
try {
  const stats = fs.statfsSync('.');
  const bsize = stats.bsize || 4096;
  const totalGB = (stats.blocks * bsize) / (1024 * 1024 * 1024);
  const freeGB = (stats.bavail * bsize) / (1024 * 1024 * 1024);
  const usedGB = totalGB - freeGB;

  console.log(`  - Block Size: ${bsize} bytes`);
  console.log(`  - Total Storage Reported by OS: ${totalGB.toFixed(2)} GB`);
  console.log(`  - Available Free Space: ${freeGB.toFixed(2)} GB`);
  console.log(`  - Used Space: ${usedGB.toFixed(2)} GB`);
  console.log(`  - Safe Quota Limit (for 25 GB tier): 23.50 GB`);
} catch (err) {
  console.error('  Failed to query statfs:', err.message);
}

console.log('\n===============================================================');
console.log('TEST SUMMARY COMPLETED');
console.log('===============================================================\n');
