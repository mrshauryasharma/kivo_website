import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const GODADDY_API_BASE = 'https://api.godaddy.com';
const DEPLOY_ZIP_PATH = path.resolve('E:/Kivo_Website_Deployment/kivo-website-godaddy-deploy.zip');

console.log('===============================================================');
console.log('KIVO BROWSER — GODADDY PRODUCTION DEPLOYMENT ENGINE');
console.log('===============================================================');

// 1. Verify PAT Presence (Securely without logging token value)
let pat = process.env.GODADDY_PAT;
if (!pat || !pat.trim()) {
  try {
    pat = execSync('powershell -NoProfile -Command "[System.Environment]::GetEnvironmentVariable(\'GODADDY_PAT\', \'User\')"', { encoding: 'utf8' }).trim();
  } catch {}
}

if (!pat || !pat.trim()) {
  console.error('\n❌ ERROR: GODADDY_PAT environment variable is not configured.');
  console.error('Please configure GODADDY_PAT using the secure instructions provided.');
  process.exit(1);
}

console.log(`\n[Step 1] Authentication Check:`);
console.log(`  - GODADDY_PAT detected: YES (Length: ${pat.trim().length} chars)`);
console.log(`  - Format: Bearer token ready for GoDaddy Hosting API`);

// Helper to make authenticated requests to GoDaddy
async function godaddyRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${GODADDY_API_BASE}${endpoint}`;
  const headers = {
    Authorization: `Bearer ${pat.trim()}`,
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return {
    status: res.status,
    headers: res.headers,
    data,
  };
}

async function runDeploy() {
  try {
    // -------------------------------------------------------------
    // Step 2: Test API Connectivity & Permissions
    // -------------------------------------------------------------
    console.log('\n[Step 2] Probing GoDaddy Hosting & Apps API:');

    // Test Hosting Apps endpoints
    let appsRes = await godaddyRequest('/v1/hosting/apps');
    if (appsRes.status === 404 || appsRes.status === 401) {
      // Fallback check v2
      const v2Res = await godaddyRequest('/v2/hosting/apps');
      if (v2Res.status === 200) appsRes = v2Res;
    }

    console.log(`  - Hosting API (/v1/hosting/apps) Response Status: ${appsRes.status}`);

    if (appsRes.status === 401 || appsRes.status === 403) {
      console.error('  ❌ Authentication/Authorization Failed with GoDaddy:');
      console.error('  Response:', JSON.stringify(appsRes.data, null, 2));
      console.error('\n  Notice: The token "Kivo" may be missing the `hosting.*` scope.');
      process.exit(1);
    }

    let targetApp = null;
    if (appsRes.status === 200 && Array.isArray(appsRes.data)) {
      console.log(`  - Discovered ${appsRes.data.length} registered hosting app(s).`);
      targetApp = appsRes.data.find(
        (a) => (a.name && a.name.toLowerCase().includes('kivo')) || (a.subdomain && a.subdomain.includes('kivo'))
      ) || appsRes.data[0];

      if (targetApp) {
        console.log(`  - Target App Identified: ${targetApp.name || targetApp.appId || targetApp.id}`);
      }
    } else {
      console.log('  - Response Data:', typeof appsRes.data === 'string' ? appsRes.data.slice(0, 300) : appsRes.data);
    }

    // -------------------------------------------------------------
    // Step 3: Inspect Deployment Package
    // -------------------------------------------------------------
    console.log('\n[Step 3] Verifying Production Deployment Package:');
    if (!fs.existsSync(DEPLOY_ZIP_PATH)) {
      console.error(`  ❌ Deployment package not found at: ${DEPLOY_ZIP_PATH}`);
      process.exit(1);
    }
    const zipStat = fs.statSync(DEPLOY_ZIP_PATH);
    console.log(`  - Package Path: ${DEPLOY_ZIP_PATH}`);
    console.log(`  - Package Size: ${(zipStat.size / (1024 * 1024)).toFixed(2)} MB`);

    // -------------------------------------------------------------
    // Step 4: Inspect Existing App & Subscription Details
    // -------------------------------------------------------------
    const shouldPublish = process.argv.includes('--publish');

    if (targetApp && targetApp.appId) {
      console.log(`\n[Step 4] Inspecting Target App: ${targetApp.appId}`);
      console.log(`  - App Name: ${targetApp.name || 'kivobrowser'}`);
      console.log(`  - Subdomain: ${targetApp.subdomain || 'kivobrowser.c37.airoapp.ai'}`);
      console.log(`  - Status: ${targetApp.status || 'Active'}`);

      // Probe App Details & Variants
      const appDetail = await godaddyRequest(`/v1/hosting/apps/${targetApp.appId}`);
      if (appDetail.status === 200) {
        console.log(`  - App Details:`, JSON.stringify(appDetail.data, null, 2));
      }

      if (shouldPublish) {
        console.log(`\n[Step 5] Uploading Package to App ${targetApp.appId}...`);
        const zipBuffer = fs.readFileSync(DEPLOY_ZIP_PATH);

        const uploadRes = await godaddyRequest(`/v1/hosting/apps/${targetApp.appId}/imports`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/zip',
            'Content-Length': zipBuffer.length.toString(),
          },
          body: zipBuffer,
        });

        console.log(`  - Upload Response: Status ${uploadRes.status}`, uploadRes.data);

        console.log('\n[Step 6] Triggering Promotion to Production:');
        const deployRes = await godaddyRequest(`/v1/hosting/apps/${targetApp.appId}/deployments`, {
          method: 'POST',
        });
        console.log(`  - Deployment Trigger Response: Status ${deployRes.status}`, deployRes.data);
      } else {
        console.log('\n[Safety Gate] Inspection completed. `--publish` flag not passed.');
        console.log('Awaiting user confirmation before publishing package to live server.');
      }
    } else {
      // Check Domains API and cPanel / Hosting plans
      console.log('\n[Step 4] Checking Domain Registration & Plans:');
      const domainsRes = await godaddyRequest('/v1/domains');
      console.log(`  - Domains API Status: ${domainsRes.status}`);
      if (domainsRes.status === 200 && Array.isArray(domainsRes.data)) {
        console.log(`  - Found ${domainsRes.data.length} registered domain(s):`, domainsRes.data.map((d) => d.domain).join(', '));
      } else {
        console.log(`  - Domains API Response:`, domainsRes.data);
      }

      // Check Subscriptions / Products API
      console.log('\n[Step 5] Checking Hosting Subscriptions & Entitlements:');
      const subRes = await godaddyRequest('/v1/subscriptions');
      console.log(`  - Subscriptions API Status: ${subRes.status}`);
      if (subRes.status === 200) {
        console.log(`  - Subscriptions:`, JSON.stringify(subRes.data, null, 2));
      } else {
        console.log(`  - Subscriptions Response:`, subRes.data);
      }
    }

    // -------------------------------------------------------------
    // Step 5: Live Verification Probe
    // -------------------------------------------------------------
    console.log('\n[Step 5] Probing Live Domain https://kivobrowser.c37.airoapp.ai/:');
    const liveRes = await fetch('https://kivobrowser.c37.airoapp.ai/health');
    console.log(`  - Live Health Status: ${liveRes.status}`);
    const liveBody = await liveRes.text();
    console.log(`  - Live Health Body: ${liveBody}`);

    console.log('\n===============================================================');
    console.log('OPERATION COMPLETED');
    console.log('===============================================================\n');
  } catch (err) {
    console.error('\n❌ Execution Error:', err.message);
  }
}

runDeploy();
