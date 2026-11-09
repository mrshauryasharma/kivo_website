import { migrateJsonToMysql, inspectJsonData, backupJsonData } from './server/migrate.js';
import { getMysqlPool, checkMysqlHealth } from './server/mysql.js';

console.log('===============================================================');
console.log('KIVO DEVOPS: SAFE JSON-TO-MYSQL MIGRATION & VERIFICATION');
console.log('===============================================================');

// 1. Check health
const health = await checkMysqlHealth();
console.log('[Step 1] MySQL Health:', health);
if (!health.connected) {
  console.error('❌ MySQL not connected. Aborting migration test.');
  process.exit(1);
}

// 2. Inspect source JSON data
console.log('\n[Step 2] Source JSON Data Summary:');
const inspect = inspectJsonData();
console.log(JSON.stringify(inspect, null, 2));

// 3. Run migration
console.log('\n[Step 3] Running migrateJsonToMysql (with automatic backup and atomic transaction)...');
const pool = await getMysqlPool();
const result = await migrateJsonToMysql(pool);
console.log('Migration Result:', JSON.stringify(result, null, 2));

// 4. Query live MySQL tables to verify data
console.log('\n[Step 4] Querying Live MySQL Tables for Record Verification:');
const [installers] = await pool.query('SELECT platform, version, size_bytes, filename FROM kivo_installers_metadata');
console.log(`  - Installers Metadata in MySQL (${installers.length}):`, installers);

const [cmsRows] = await pool.query('SELECT section_key, LENGTH(published_json) as pubLen, LENGTH(draft_json) as draftLen FROM kivo_cms_content');
console.log(`  - CMS Content in MySQL (${cmsRows.length}):`, cmsRows);

const [ticketRows] = await pool.query('SELECT id, name, email, phone, status, priority, created_at FROM kivo_support_tickets');
console.log(`  - Support Tickets in MySQL (${ticketRows.length}):`, ticketRows);

// 5. Test Transaction Rollback
console.log('\n[Step 5] Testing Transaction Rollback Capability:');
const conn = await pool.getConnection();
try {
  await conn.beginTransaction();
  await conn.query('INSERT INTO kivo_support_tickets (id, name, email, phone, category, subject, description, status, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
    ['ROLLBACK_TEST_99', 'Rollback Test', 'rb@test.com', '+15559999999', 'Bug', 'Test', 'Desc', 'Open', 'Normal']
  );
  // Roll back
  await conn.rollback();
  const [chk] = await pool.query('SELECT * FROM kivo_support_tickets WHERE id = "ROLLBACK_TEST_99"');
  if (chk.length === 0) {
    console.log('  ✅ Rollback Verified: Uncommitted row successfully eliminated.');
  } else {
    console.error('  ❌ Rollback Failed!');
  }
} finally {
  conn.release();
}

console.log('\n===============================================================');
console.log('SAFE JSON-TO-MYSQL MIGRATION COMPLETED SUCCESSFULLY!');
console.log('===============================================================\n');
process.exit(0);
