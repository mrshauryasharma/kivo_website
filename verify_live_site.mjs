const BASE_URL = 'https://kivobrowser.c37.airoapp.ai';

console.log('===============================================================');
console.log(`LIVE PRODUCTION VERIFICATION: ${BASE_URL}`);
console.log('===============================================================');

const tests = [
  { name: 'Root Homepage (HTTPS)', path: '/', method: 'GET', expectedStatus: 200 },
  { name: 'Backend Health Endpoint', path: '/health', method: 'GET', expectedStatus: 200 },
  { name: 'CMS Published Content API', path: '/api/content', method: 'GET', expectedStatus: 200 },
  { name: 'Installer Downloads Status API', path: '/api/downloads/status', method: 'GET', expectedStatus: 200 },
  { name: 'Customer Support Portal Route', path: '/support/track', method: 'GET', expectedStatus: 200 },
  { name: 'Customer Support OTP Request (Validation)', path: '/api/support/track/request-otp', method: 'POST', body: { ticketId: 'test', email: 'test@example.com' }, expectedStatus: 400 },
  { name: 'Admin Auth Check (Unauthorized)', path: '/api/auth/me', method: 'GET', expectedStatus: 200 },
];

let passed = 0;

for (const t of tests) {
  try {
    const options = {
      method: t.method,
      headers: { 'Accept': 'application/json, text/html' },
    };
    if (t.body) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(t.body);
    }

    const res = await fetch(`${BASE_URL}${t.path}`, options);
    const body = await res.text();
    const ok = res.status === t.expectedStatus;

    if (ok) {
      passed++;
      console.log(`  ✅ [PASS] ${t.name}: Status ${res.status}`);
    } else {
      console.log(`  ❌ [FAIL] ${t.name}: Status ${res.status} (expected ${t.expectedStatus}) | Body: ${body.slice(0, 100)}`);
    }
  } catch (err) {
    console.log(`  ❌ [ERROR] ${t.name}: ${err.message}`);
  }
}

console.log('===============================================================');
console.log(`RESULTS: ${passed}/${tests.length} tests passed successfully!`);
console.log('===============================================================\n');
