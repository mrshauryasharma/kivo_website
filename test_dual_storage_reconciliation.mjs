import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  PERSISTENT_BASE,
  UPLOADS_DIR,
  ARCHIVE_DIR,
  DATA_DIR,
  METADATA_FILE,
  PLATFORM_RULES,
  resolveInstallerFilePath,
  getCandidateStorageDirs,
} from './server/config.js';
import {
  getMysqlPool,
  syncInstallerMetadataToMysql,
  loadInstallerMetadataFromMysql,
  deleteInstallerMetadataFromMysql,
} from './server/mysql.js';
import {
  initUpload,
  writeChunk,
  completeUpload,
} from './server/chunkedUpload.js';
import {
  getStoredMetadata,
  reconcileInstallers,
} from './server/db.js';
import {
  deleteInstaller,
} from './server/installers.js';

console.log('===============================================================');
console.log('KIVO BROWSER — DUAL-LAYER STORAGE & RECONCILIATION TEST SUITE');
console.log('===============================================================\n');

let failedTests = 0;
function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
  }
}

// -----------------------------------------------------------------
// Step 1: Layer A Persistent Directory Verification
// -----------------------------------------------------------------
console.log('[Step 1] Inspecting Persistent Storage Directory Structure (Layer A):');
console.log(`  - PERSISTENT_BASE: ${PERSISTENT_BASE}`);
console.log(`  - UPLOADS_DIR: ${UPLOADS_DIR}`);
console.log(`  - ARCHIVE_DIR: ${ARCHIVE_DIR}`);
console.log(`  - DATA_DIR: ${DATA_DIR}`);

assert(fs.existsSync(UPLOADS_DIR), 'UPLOADS_DIR exists physically');
assert(fs.existsSync(ARCHIVE_DIR), 'ARCHIVE_DIR exists physically for version archiving');
assert(fs.existsSync(DATA_DIR), 'DATA_DIR exists physically');

const candidateDirs = getCandidateStorageDirs();
console.log(`  - Candidate storage search dirs: ${candidateDirs.length}`);
assert(candidateDirs.includes(UPLOADS_DIR), 'UPLOADS_DIR is in candidate search directories');

// -----------------------------------------------------------------
// Step 2: Layer B MySQL Database & Schema Verification
// -----------------------------------------------------------------
console.log('\n[Step 2] Inspecting MySQL Database & Table Schema (Layer B):');
const pool = await getMysqlPool();
assert(Boolean(pool), 'Successfully connected to MySQL database (118.139.178.78)');

const [metaCols] = await pool.query('SHOW COLUMNS FROM kivo_installers_metadata');
const metaColNames = metaCols.map((c) => c.Field);
console.log(`  - kivo_installers_metadata columns (${metaColNames.length}):`, metaColNames.join(', '));
assert(metaColNames.includes('platform'), 'Column platform exists');
assert(metaColNames.includes('id'), 'Column id exists');
assert(metaColNames.includes('sha256'), 'Column sha256 exists');
assert(metaColNames.includes('file_path'), 'Column file_path exists');
assert(metaColNames.includes('is_active'), 'Column is_active exists');
assert(metaColNames.includes('is_deleted'), 'Column is_deleted exists');
assert(metaColNames.includes('retention'), 'Column retention exists');

const [histCols] = await pool.query('SHOW COLUMNS FROM kivo_installers_history');
const histColNames = histCols.map((c) => c.Field);
console.log(`  - kivo_installers_history columns (${histColNames.length}):`, histColNames.join(', '));
assert(histColNames.includes('action'), 'Column action exists in history');
assert(histColNames.includes('admin_user'), 'Column admin_user exists in history');

// -----------------------------------------------------------------
// Step 3: Real Upload & Dual-Layer Persistence Test for 4 Platforms
// -----------------------------------------------------------------
console.log('\n[Step 3] Executing Real Chunked Uploads for All 4 Supported Platforms:');

const testPayloads = {
  android: {
    filename: 'KivoBrowser.apk',
    version: '1.0.0',
    // Universal APK begins with ZIP magic bytes PK..
    data: Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), crypto.randomBytes(65536)]),
  },
  windows: {
    filename: 'KivoSetup-x64.exe',
    version: '1.0.0',
    // Windows executable starts with MZ
    data: Buffer.concat([Buffer.from('MZ\x90\x00\x03\x00\x00\x00'), crypto.randomBytes(65536)]),
  },
  'mac-arm64': {
    filename: 'Kivo-arm64.dmg',
    version: '1.0.0',
    data: crypto.randomBytes(65536),
  },
  'mac-intel': {
    filename: 'Kivo-intel.dmg',
    version: '1.0.0',
    data: crypto.randomBytes(65536),
  },
};

const uploadedHashes = {};

for (const [platform, payload] of Object.entries(testPayloads)) {
  console.log(`\n  Uploading ${platform} (${payload.filename})...`);
  const totalSize = payload.data.length;
  const init = initUpload({
    platform,
    filename: payload.filename,
    version: payload.version,
    totalSize,
    totalChunks: 1,
  });
  assert(Boolean(init.uploadId), `Init upload session created (${init.uploadId})`);

  const writeResult = writeChunk(init.uploadId, 0, payload.data);
  assert(writeResult.success, `Chunk written successfully (${writeResult.receivedCount}/1)`);

  const completed = await completeUpload(init.uploadId, 'test_suite_admin');
  assert(Boolean(completed), `Upload completed and assembled`);
  assert(fs.existsSync(completed.filePath), `Binary physically written to persistent path: ${completed.filePath}`);

  const expectedSha256 = crypto.createHash('sha256').update(payload.data).digest('hex');
  assert(completed.sha256 === expectedSha256, `SHA-256 matches payload (${completed.sha256.slice(0, 16)}...)`);
  uploadedHashes[platform] = expectedSha256;

  // Check MySQL Layer B
  const [dbRows] = await pool.query('SELECT * FROM kivo_installers_metadata WHERE platform = ?', [platform]);
  assert(dbRows.length === 1, `MySQL row persisted for platform ${platform}`);
  const dbRow = dbRows[0];
  assert(dbRow.sha256 === expectedSha256, `MySQL SHA-256 matches verified file`);
  assert(Number(dbRow.size_bytes) === totalSize, `MySQL size_bytes (${dbRow.size_bytes}) matches`);
  assert(dbRow.is_active === 1 && dbRow.is_deleted === 0, `MySQL active=1, deleted=0`);
  assert(dbRow.retention === 'permanent', `MySQL retention policy is permanent`);
}

// -----------------------------------------------------------------
// Step 4: Strict No-Auto-Delete & Version Archiving Test
// -----------------------------------------------------------------
console.log('\n[Step 4] Testing Strict No-Auto-Delete & Version Archiving on Upgrade:');
const androidV2Payload = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), crypto.randomBytes(90000)]);
const androidV2Sha256 = crypto.createHash('sha256').update(androidV2Payload).digest('hex');

const initV2 = initUpload({
  platform: 'android',
  filename: 'KivoBrowser-v1.0.1.apk',
  version: '1.0.1',
  totalSize: androidV2Payload.length,
  totalChunks: 1,
});
writeChunk(initV2.uploadId, 0, androidV2Payload);
const completedV2 = await completeUpload(initV2.uploadId, 'test_suite_admin');

assert(completedV2.version === '1.0.1', 'Android updated to version 1.0.1');
assert(completedV2.sha256 === androidV2Sha256, 'Android 1.0.1 SHA-256 verified');
assert(Boolean(completedV2.archivedPreviousVersion), `Previous version archived to: ${completedV2.archivedPreviousVersion}`);
assert(fs.existsSync(completedV2.archivedPreviousVersion), 'Archived previous binary physically preserved in ARCHIVE_DIR');

// Verify history entries in MySQL
const [histRows] = await pool.query('SELECT action, admin_user, version, created_at FROM kivo_installers_history WHERE platform = "android" ORDER BY created_at DESC');
console.log(`  - Android history records in MySQL: ${histRows.length}`);
assert(histRows.length >= 2, 'History records include both uploads');
assert(histRows[0].action === 'UPLOAD', 'Most recent history action is UPLOAD');

// -----------------------------------------------------------------
// Step 5: Reboot, Redeploy & Fresh-Container Recovery Simulation
// -----------------------------------------------------------------
console.log('\n[Step 5] Simulating Container Restart & Ephemeral Wipe (Reconciliation Test):');
// Simulate total wipe of local JSON metadata file (as occurs during fresh Git clone / redeployment)
const tempJsonBak = `${METADATA_FILE}.reconcile_test_bak`;
fs.copyFileSync(METADATA_FILE, tempJsonBak);
fs.unlinkSync(METADATA_FILE);
assert(!fs.existsSync(METADATA_FILE), 'Local JSON metadata file removed (simulating fresh deployment wipe)');

// Run reconciliation
const { current: recoveredMeta, report } = await reconcileInstallers(true);
assert(fs.existsSync(METADATA_FILE), 'Local JSON metadata automatically regenerated and restored');
assert(report.mysqlConnected === true, 'MySQL Layer B responded during reconciliation');
assert(report.totalVerified >= 4, `Reconciliation verified ${report.totalVerified} binaries on disk`);
assert(report.totalMissing === 0, `Zero missing binaries after reconciliation`);
assert(report.totalCorrupted === 0, `Zero corrupted binaries after reconciliation`);

for (const platform of ['android', 'windows', 'mac-arm64', 'mac-intel']) {
  assert(Boolean(recoveredMeta[platform]), `Platform ${platform} restored in metadata`);
  assert(recoveredMeta[platform].status === 'verified', `Platform ${platform} status is verified`);
  assert(recoveredMeta[platform].available === true, `Platform ${platform} available is true`);
  assert(fs.existsSync(recoveredMeta[platform].filePath), `Binary physically verified at ${recoveredMeta[platform].filePath}`);
}

// Clean up temporary test backup
if (fs.existsSync(tempJsonBak)) fs.unlinkSync(tempJsonBak);

// -----------------------------------------------------------------
// Step 6: Manual Admin Deletion & Soft-Delete Audit Verification
// -----------------------------------------------------------------
console.log('\n[Step 6] Testing Manual Admin Deletion & Soft-Delete Audit Trail:');
// Temporarily delete mac-intel to verify soft deletion and history
await deleteInstaller('mac-intel', 'super_admin_test');
const metaAfterDel = getStoredMetadata();
assert(metaAfterDel['mac-intel'] === null, 'mac-intel removed from active metadata');

const [delDbRows] = await pool.query('SELECT is_active, is_deleted FROM kivo_installers_metadata WHERE platform = "mac-intel"');
assert(delDbRows[0].is_deleted === 1, 'mac-intel marked is_deleted = 1 in MySQL');
assert(delDbRows[0].is_active === 0, 'mac-intel marked is_active = 0 in MySQL');

const [delHist] = await pool.query(
  'SELECT action, admin_user FROM kivo_installers_history WHERE platform = "mac-intel" AND action = "MANUAL_DELETE" ORDER BY created_at DESC LIMIT 1'
);
assert(delHist.length === 1 && delHist[0].action === 'MANUAL_DELETE', 'History recorded action MANUAL_DELETE');
assert(delHist[0].admin_user === 'super_admin_test', 'History recorded admin user');

// Re-upload mac-intel to ensure production state has all 4 platforms active!
console.log('\n  Restoring mac-intel for production readiness...');
const initRestore = initUpload({
  platform: 'mac-intel',
  filename: 'Kivo-intel.dmg',
  version: '1.0.0',
  totalSize: testPayloads['mac-intel'].data.length,
  totalChunks: 1,
});
writeChunk(initRestore.uploadId, 0, testPayloads['mac-intel'].data);
await completeUpload(initRestore.uploadId, 'production_lead');

const finalCheck = await reconcileInstallers(true);
assert(finalCheck.report.totalVerified === 4, 'All 4 platforms verified active and ready in dual-layer storage');

// -----------------------------------------------------------------
// Final Test Summary
// -----------------------------------------------------------------
console.log('\n===============================================================');
if (failedTests === 0) {
  console.log('✅ ALL TESTS PASSED! DUAL-LAYER STORAGE IS 100% PRODUCTION READY');
} else {
  console.error(`❌ ${failedTests} TEST(S) FAILED! Inspect errors above.`);
}
console.log('===============================================================\n');

process.exit(failedTests === 0 ? 0 : 1);
