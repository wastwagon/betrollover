#!/usr/bin/env node
/**
 * Test SendGrid email delivery.
 * Run: cd backend && node ../scripts/test-sendgrid.js
 *   (loads SENDGRID_API_KEY, SMTP_FROM from backend/.env or root .env)
 * Or: SENDGRID_API_KEY=SG.xxx SMTP_FROM=you@domain.com TO=recipient@email.com node scripts/test-sendgrid.js
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

const sgMail = require('@sendgrid/mail');

const apiKey = process.env.SENDGRID_API_KEY;
const from = process.env.SMTP_FROM || 'noreply@betrollover.com';
const to = process.env.TO || process.argv[2] || 'admin@betrollover.com';

if (!apiKey) {
  console.error('ERROR: SENDGRID_API_KEY is not set.');
  console.error('Run: SENDGRID_API_KEY=SG.xxx SMTP_FROM=verified@yourdomain.com TO=recipient@email.com node scripts/test-sendgrid.js');
  process.exit(1);
}

sgMail.setApiKey(apiKey);

const fromEmail = (from.match(/<([^>]+)>/) || [null, from])[1] || from;
const msg = {
  to,
  from: { email: fromEmail.trim(), name: 'BetRollover' },
  subject: 'BetRollover - Test Email',
  text: 'This is a test email from BetRollover. Your SendGrid configuration is working correctly.',
  html: '<p>This is a test email from BetRollover. Your SendGrid configuration is working correctly.</p>',
};

console.log('Sending test email...');
console.log('  From:', msg.from);
console.log('  To:', to);

sgMail
  .send(msg)
  .then(() => {
    console.log('SUCCESS: Test email sent! Check inbox at', to);
    process.exit(0);
  })
  .catch((err) => {
    console.error('FAILED:', err.message);
    if (err.response?.body?.errors) {
      err.response.body.errors.forEach((e) => console.error('  -', e.message));
    }
    process.exit(1);
  });
