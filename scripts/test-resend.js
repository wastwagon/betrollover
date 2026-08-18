#!/usr/bin/env node
/**
 * Test Resend email delivery.
 * Run: cd backend && node ../scripts/test-resend.js
 *   (loads RESEND_API_KEY, SMTP_FROM from backend/.env or root .env)
 * Or: RESEND_API_KEY=re_xxx SMTP_FROM=you@domain.com TO=recipient@email.com node scripts/test-resend.js
 */
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '..');
function loadEnv(file) {
  try {
    const p = path.join(root, file);
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8');
      content.split('\n').forEach((line) => {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
      });
    }
  } catch (_) {}
}
loadEnv('.env');
loadEnv('backend/.env');

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.SMTP_FROM || 'noreply@betrollover.com';
const to = process.env.TO || process.argv[2] || 'admin@betrollover.com';

if (!apiKey) {
  console.error('ERROR: RESEND_API_KEY is not set.');
  console.error('Run: RESEND_API_KEY=re_xxx SMTP_FROM=verified@yourdomain.com TO=recipient@email.com node scripts/test-resend.js');
  process.exit(1);
}

const payload = {
  from,
  to: [to],
  subject: 'BetRollover - Test Email',
  text: 'This is a test email from BetRollover. Your Resend configuration is working correctly.',
  html: '<p>This is a test email from BetRollover. Your Resend configuration is working correctly.</p>',
};

console.log('Sending test email via Resend...');
console.log('  From:', from);
console.log('  To:', to);

fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
})
  .then(async (res) => {
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('FAILED:', body.message || JSON.stringify(body));
      process.exit(1);
    }
    console.log('SUCCESS: Test email sent! Check inbox at', to);
    process.exit(0);
  })
  .catch((err) => {
    console.error('FAILED:', err.message);
    process.exit(1);
  });
