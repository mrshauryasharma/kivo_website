import { execSync } from 'node:child_process';

const envVars = ['DB_HOST', 'MYSQL_HOST', 'DB_USER', 'MYSQL_USER', 'DB_NAME', 'MYSQL_DATABASE', 'DB_PASSWORD', 'MYSQL_PASSWORD'];

console.log('Checking for MySQL credentials in Windows Environment:');
for (const v of envVars) {
  let val = '';
  try {
    val = execSync(`powershell -NoProfile -Command "[System.Environment]::GetEnvironmentVariable('${v}', 'User')"`, { encoding: 'utf8' }).trim();
  } catch {}
  console.log(`  - ${v}: ${val ? 'FOUND (Length: ' + val.length + ')' : 'NOT SET'}`);
}
