import { backupJsonData, inspectJsonData } from './server/migrate.js';
import { checkMysqlHealth } from './server/mysql.js';
import { getStoredMetadata, getCmsPublished, getTicketsStore } from './server/db.js';

console.log('===============================================================');
console.log('KIVO BROWSER — PRE-MIGRATION & DATABASE READINESS AUDIT');
console.log('===============================================================\n');

// Bootstrap defaults if unpopulated
getStoredMetadata();
getCmsPublished();
getTicketsStore();

// 1. Inspect existing JSON data structure
console.log('[Step 1] Inspecting Current JSON Storage Data Structure:');
const structure = inspectJsonData();
console.log('Record Summary:', JSON.stringify(structure, null, 2));

// 2. Perform and verify automatic JSON backup
console.log('\n[Step 2] Executing Pre-Migration Safe Backup:');
const backupResult = backupJsonData();
console.log('Backup Success:', backupResult.success);
console.log('Backup Directory:', backupResult.targetDir);
console.log('Backed Up Files:', backupResult.backedUpFiles);

// 3. Check MySQL Connectivity
console.log('\n[Step 3] Probing MySQL Database Connectivity:');
const health = await checkMysqlHealth();
console.log('MySQL Health Status:', health);

console.log('\n===============================================================');
if (health.connected) {
  console.log('STATUS: MySQL CONNECTED & READY FOR LIVE MIGRATION');
} else if (health.configured) {
  console.log('STATUS: FAIL — MySQL is configured but credentials/host are unreachable');
} else {
  console.log('STATUS: BLOCKED — Awaiting GoDaddy cPanel / External MySQL host & credentials');
}
console.log('===============================================================\n');
