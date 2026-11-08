// global fetch is available in Node 18+

const LIVE_BASE = 'https://kivobrowser.c37.airoapp.ai';

console.log('===============================================================');
console.log('KIVO LIVE PRODUCTION FULL FUNCTIONALITY PROBE');
console.log('Target:', LIVE_BASE);
console.log('===============================================================\n');

async function run() {
  let passed = 0;
  let total = 0;

  async function check(desc, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✅ [PASS] ${desc}`);
      passed++;
    } catch (e) {
      console.log(`  ❌ [FAIL] ${desc}: ${e.message}`);
    }
  }

  // 1. Health
  await check('Health Check (/health)', async () => {
    const res = await fetch(`${LIVE_BASE}/health`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.status !== 'ok') throw new Error(`Payload ${JSON.stringify(data)}`);
  });

  // 2. CMS Published Content
  await check('CMS Content (/api/content)', async () => {
    const res = await fetch(`${LIVE_BASE}/api/content`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data || !data.content || !data.content.hero) throw new Error(`Malformed content: ${JSON.stringify(data).slice(0, 100)}`);
  });

  // 3. Downloads Status
  await check('Installer Downloads Status (/api/downloads/status)', async () => {
    const res = await fetch(`${LIVE_BASE}/api/downloads/status`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data || !data.windows) throw new Error(`Malformed status`);
  });

  // 4. Create Support Ticket
  let ticketId = null;
  let customerToken = null;
  await check('Ticket Submission (/api/support/ticket)', async () => {
    const payload = {
      name: 'Autonomous Deployment Test',
      email: 'test@kivobrowser.com',
      phone: '+919999999999',
      subject: 'Live Production Autonomous Verification Ticket',
      category: 'General Feedback',
      description: 'Verifying ticket creation, token generation, and tracking on live production environment.'
    };
    const res = await fetch(`${LIVE_BASE}/api/support/ticket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.status !== 201) {
      const errText = await res.text();
      throw new Error(`Status ${res.status}: ${errText}`);
    }
    const data = await res.json();
    if (!data.ticketId || !data.customerToken) throw new Error(`Missing ticketId or token: ${JSON.stringify(data)}`);
    ticketId = data.ticketId;
    customerToken = data.customerToken;
    console.log(`       -> Created Ticket: ${ticketId}`);
  });

  // 5. Track Ticket by Token
  await check('Track Ticket via Customer Token', async () => {
    if (!ticketId || !customerToken) throw new Error('Ticket not created');
    const res = await fetch(`${LIVE_BASE}/api/support/ticket/${ticketId}?token=${customerToken}`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.id !== ticketId && data.ticket?.id !== ticketId) throw new Error(`Ticket ID mismatch: ${JSON.stringify(data)}`);
  });

  // 6. Request OTP for Ticket
  await check('Request Verification OTP for Ticket', async () => {
    if (!ticketId) throw new Error('Ticket not created');
    const res = await fetch(`${LIVE_BASE}/api/support/track/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId, email: 'test@kivobrowser.com' })
    });
    if (res.status !== 200) {
      const errText = await res.text();
      throw new Error(`Status ${res.status}: ${errText}`);
    }
    const data = await res.json();
    if (!data.success) throw new Error(`OTP response not successful: ${JSON.stringify(data)}`);
  });

  // 7. Security Header Check (CSP, HSTS/Cloudflare, CORS)
  await check('Security Headers on Live Root (/)', async () => {
    const res = await fetch(`${LIVE_BASE}/`);
    const csp = res.headers.get('content-security-policy');
    const xcto = res.headers.get('x-content-type-options');
    const xfo = res.headers.get('x-frame-options');
    if (!xcto) throw new Error('Missing X-Content-Type-Options');
    if (!xfo) throw new Error('Missing X-Frame-Options');
    console.log(`       -> CSP: ${csp ? 'Active' : 'Missing'} | X-Frame-Options: ${xfo}`);
  });

  console.log('\n===============================================================');
  console.log(`SUMMARY: ${passed}/${total} LIVE TESTS PASSED (${((passed / total) * 100).toFixed(0)}%)`);
  console.log('===============================================================\n');
}

run().catch((err) => console.error(err));
