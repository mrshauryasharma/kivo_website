import { execSync } from 'node:child_process';

let resendKey = process.env.RESEND_API_KEY;
if (!resendKey || !resendKey.trim()) {
  try {
    resendKey = execSync('powershell -NoProfile -Command "[System.Environment]::GetEnvironmentVariable(\'RESEND_API_KEY\', \'User\')"', { encoding: 'utf8' }).trim();
  } catch {}
}

if (!resendKey) {
  console.error('RESEND_API_KEY not found');
  process.exit(1);
}

console.log('Testing Resend API with detected key (Length:', resendKey.length, ')...');

async function checkResend() {
  // 1. Check API key domains
  const domainsRes = await fetch('https://api.resend.com/domains', {
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json'
    }
  });

  console.log('Resend /domains HTTP Status:', domainsRes.status);
  const domainsData = await domainsRes.json();
  console.log('Configured domains in Resend:', domainsData);

  // 2. Test sending a verification email via Resend API
  // Using onboarding@resend.dev or the verified domain
  let fromAddress = 'onboarding@resend.dev';
  if (domainsData && domainsData.data && domainsData.data.length > 0) {
    const verifiedDomain = domainsData.data.find(d => d.status === 'verified');
    if (verifiedDomain) {
      fromAddress = `support@${verifiedDomain.name}`;
    }
  }
  console.log('Using sender address:', fromAddress);

  // Send test email
  const sendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: `KIVO Browser <${fromAddress}>`,
      to: ['delivered@resend.dev'], // Resend official delivered test sink or user email
      subject: 'KIVO Browser — Resend API Live Verification',
      html: '<div style="background:#0a0a0c;color:#ffffff;padding:20px;font-family:sans-serif;"><h2 style="color:#00f2fe;">KIVO Browser System Active</h2><p>This email verifies that your Resend API integration is fully operational.</p></div>'
    })
  });

  console.log('Resend Send Email HTTP Status:', sendRes.status);
  const sendData = await sendRes.json();
  console.log('Resend Send Email Response:', sendData);
}

checkResend().catch(err => console.error('Error:', err));
