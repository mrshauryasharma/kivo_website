import { execSync } from 'node:child_process';

const GODADDY_API_BASE = 'https://api.godaddy.com';
const APP_ID = 'NODEJS-ns2brf47fj';

// 1. Get tokens safely
let pat = process.env.GODADDY_PAT;
if (!pat || !pat.trim()) {
  try {
    pat = execSync('powershell -NoProfile -Command "[System.Environment]::GetEnvironmentVariable(\'GODADDY_PAT\', \'User\')"', { encoding: 'utf8' }).trim();
  } catch {}
}

let resendKey = process.env.RESEND_API_KEY;
if (!resendKey || !resendKey.trim()) {
  try {
    resendKey = execSync('powershell -NoProfile -Command "[System.Environment]::GetEnvironmentVariable(\'RESEND_API_KEY\', \'User\')"', { encoding: 'utf8' }).trim();
  } catch {}
}

console.log('===============================================================');
console.log('KIVO DEVOPS: SECRETS & ENVIRONMENT CONFIGURATION');
console.log('===============================================================');
console.log(`GODADDY_PAT detected: ${Boolean(pat)} (Length: ${pat ? pat.length : 0})`);
console.log(`RESEND_API_KEY detected: ${Boolean(resendKey)} (Length: ${resendKey ? resendKey.length : 0})`);
if (resendKey) {
  console.log(`RESEND_API_KEY prefix: ${resendKey.slice(0, 7)}...`);
}

async function godaddyRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${GODADDY_API_BASE}${endpoint}`;
  const headers = {
    Authorization: `Bearer ${pat.trim()}`,
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });
  const contentType = res.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  return { status: res.status, headers: res.headers, data };
}

async function run() {
  // Check existing secrets
  console.log(`\n[1] Fetching existing secrets for app ${APP_ID}...`);
  const secretsRes = await godaddyRequest(`/v1/hosting/apps/${APP_ID}/secrets`);
  console.log(`Status: ${secretsRes.status}`);
  console.log('Existing secrets metadata:', secretsRes.data);

  if (!resendKey) {
    console.error('❌ RESEND_API_KEY not found in Windows User environment variables.');
    return;
  }

  // Attempt to set RESEND_API_KEY in GoDaddy Hosting App Secrets
  console.log(`\n[2] Updating GoDaddy Hosting App Secrets with RESEND_API_KEY using application/json-patch+json...`);
  
  // Try RFC 6902 JSON patch
  const patchPayload = [
    { op: 'add', path: '/RESEND_API_KEY', value: resendKey }
  ];

  let patchRes = await godaddyRequest(`/v1/hosting/apps/${APP_ID}/secrets`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json-patch+json' },
    body: JSON.stringify(patchPayload)
  });
  console.log(`PATCH /secrets (path /RESEND_API_KEY) status: ${patchRes.status}`, patchRes.data);

  if (patchRes.status >= 400) {
    // Try path '/-' or path '/items/-' or '/0'
    const patchPayload2 = [
      { op: 'add', path: '/-', value: { name: 'RESEND_API_KEY', value: resendKey } }
    ];
    let patchRes2 = await godaddyRequest(`/v1/hosting/apps/${APP_ID}/secrets`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json-patch+json' },
      body: JSON.stringify(patchPayload2)
    });
    console.log(`PATCH /secrets (path /-) status: ${patchRes2.status}`, patchRes2.data);
  }

  // Verify updated secrets with variants
  console.log('\n[3] Checking Secrets across variants:');
  const publishSecrets = await godaddyRequest(`/v1/hosting/apps/${APP_ID}/secrets?variant=publish`);
  console.log('Publish variant secrets:', publishSecrets.data);

  // If publish variant doesn't have it or if we can patch with path /variants/publish/RESEND_API_KEY or /shared/RESEND_API_KEY:
  const patchPublish = await godaddyRequest(`/v1/hosting/apps/${APP_ID}/secrets?variant=publish`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json-patch+json' },
    body: JSON.stringify([{ op: 'add', path: '/RESEND_API_KEY', value: resendKey }])
  });
  console.log(`PATCH /secrets?variant=publish status: ${patchPublish.status}`, patchPublish.data);

  // Also try patching shared
  const patchShared = await godaddyRequest(`/v1/hosting/apps/${APP_ID}/secrets`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json-patch+json' },
    body: JSON.stringify([{ op: 'add', path: '/shared/RESEND_API_KEY', value: resendKey }])
  });
  console.log(`PATCH /secrets (shared) status: ${patchShared.status}`, patchShared.data);

  const finalCheck = await godaddyRequest(`/v1/hosting/apps/${APP_ID}/secrets?variant=publish`);
  console.log('Final Publish Secrets:', finalCheck.data);
}

run().catch((err) => console.error('Error:', err));
