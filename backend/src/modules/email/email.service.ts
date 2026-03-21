import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import * as sgMail from '@sendgrid/mail';
import { SmtpSettings } from './entities/smtp-settings.entity';
import { UsersService } from '../users/users.service';
import { getEmailSubject, getCtaText, getCategoryColor } from '../notifications/notification-types.config';
import {
  ADMIN_NOTIFICATION_TEMPLATES,
  AdminNotificationType,
} from './admin-notification-templates.config';

/** Premium transactional palette — dark surround, gold accent, crisp card */
const BR = {
  outerBg:
    'background:linear-gradient(165deg,#05070d 0%,#0c1224 42%,#080b14 100%);',
  cardBg: '#fafbfc',
  gold: '#c9a227',
  goldSoft: 'rgba(201,162,39,0.35)',
  ink: '#0f172a',
  muted: '#64748b',
  line: '#e2e8f0',
  adminInk: '#0c1224',
} as const;

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @InjectRepository(SmtpSettings)
    private smtpRepo: Repository<SmtpSettings>,
    private usersService: UsersService,
  ) { }

  private escapeEmailText(s: string): string {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /**
   * Shared premium shell: gradient backdrop, gold hairline, elevated card.
   */
  private premiumDocument(innerRows: string, footerExtra?: string): string {
    const foot = footerExtra
      ? `<p style="font-size:11px;color:#64748b;margin:20px 0 0;text-align:center;line-height:1.5;">${footerExtra}</p>`
      : '';
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="color-scheme" content="light dark"/>
</head>
<body style="margin:0;padding:0;${BR.outerBg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;background:${BR.cardBg};border-radius:20px;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);border:1px solid ${BR.goldSoft};">
          <tr>
            <td style="height:5px;background:linear-gradient(90deg,#8b6914,#e8d48b,#c9a227,#e8d48b,#8b6914);"></td>
          </tr>
          ${innerRows}
        </table>
        <p style="font-size:11px;color:#64748b;margin:24px 0 0;text-align:center;letter-spacing:0.06em;text-transform:uppercase;">BetRollover</p>
        ${foot}
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private brandHeader(eyebrow: string, title: string, subtitle?: string): string {
    const sub = subtitle
      ? `<p style="font-size:15px;color:${BR.muted};margin:12px 0 0;line-height:1.5;">${subtitle}</p>`
      : '';
    return `<tr>
  <td style="padding:36px 36px 8px;text-align:center;">
    <div style="font-size:11px;font-weight:700;letter-spacing:0.28em;color:${BR.gold};text-transform:uppercase;">${eyebrow}</div>
    <h1 style="font-size:22px;font-weight:700;color:${BR.ink};margin:14px 0 0;letter-spacing:-0.02em;">${title}</h1>
    ${sub}
  </td>
</tr>`;
  }

  private async getFromWithSettings(): Promise<string> {
    const settings = await this.smtpRepo.findOne({ where: { id: 1 } });
    const from = process.env.SMTP_FROM || (settings ? `"${settings.fromName}" <${settings.fromEmail}>` : '"BetRollover" <noreply@betrollover.com>');
    return from;
  }

  private async getTransporter() {
    const settings = await this.smtpRepo.findOne({ where: { id: 1 } });
    const password = process.env.SMTP_PASSWORD || process.env.SENDGRID_API_KEY || settings?.password;
    if (!password) return null;

    const host = process.env.SMTP_HOST || settings?.host || 'smtp.sendgrid.net';
    const port = parseInt(process.env.SMTP_PORT || String(settings?.port || 465), 10);
    const secure = port === 465;
    const user = process.env.SMTP_USERNAME || settings?.username || 'apikey';

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass: password },
    });
  }

  private readonly SEND_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async send(options: { to: string; subject: string; text: string; html?: string }) {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (apiKey) {
      return this.sendViaSendGrid(options, apiKey);
    }

    const transporter = await this.getTransporter();
    if (!transporter) {
      this.logger.error('CRITICAL: Email not configured. Set SENDGRID_API_KEY or SMTP settings. Registration OTP will fail.');
      return { sent: false, error: 'Email configuration missing on server' };
    }

    return this.sendViaSmtp(options, transporter);
  }

  private async sendViaSendGrid(
    options: { to: string; subject: string; text: string; html?: string },
    apiKey: string,
  ): Promise<{ sent: boolean; error?: string }> {
    sgMail.setApiKey(apiKey);
    const from = await this.getFromWithSettings();
    const msg = {
      to: options.to,
      from,
      subject: options.subject,
      text: options.text,
      html: options.html || options.text.replace(/\n/g, '<br>'),
    };

    let lastError: string | undefined;
    for (let attempt = 1; attempt <= this.SEND_RETRIES; attempt++) {
      try {
        await sgMail.send(msg);
        return { sent: true };
      } catch (err: unknown) {
        const body = (err as { response?: { body?: unknown } })?.response?.body ?? err;
        this.logger.warn(`SendGrid attempt ${attempt}/${this.SEND_RETRIES} failed: ${JSON.stringify(body)}`);
        const errObj = err as { response?: { body?: { errors?: { message?: string }[] } }; message?: string };
        lastError = String(errObj?.response?.body?.errors?.[0]?.message || errObj?.message || (err instanceof Error ? err.message : err));
        if (attempt < this.SEND_RETRIES) await this.sleep(this.RETRY_DELAY_MS * attempt);
      }
    }
    this.logger.error(`SendGrid email failed after ${this.SEND_RETRIES} attempts`);
    return { sent: false, error: lastError };
  }

  private async sendViaSmtp(
    options: { to: string; subject: string; text: string; html?: string },
    transporter: nodemailer.Transporter,
  ): Promise<{ sent: boolean; error?: string }> {
    const from = await this.getFromWithSettings();
    const mailOptions = {
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || options.text.replace(/\n/g, '<br>'),
    };

    let lastError: string | undefined;
    for (let attempt = 1; attempt <= this.SEND_RETRIES; attempt++) {
      try {
        await transporter.sendMail(mailOptions);
        return { sent: true };
      } catch (err) {
        this.logger.warn(`SMTP attempt ${attempt}/${this.SEND_RETRIES} failed: ${err instanceof Error ? err.message : String(err)}`);
        lastError = err instanceof Error ? err.message : String(err);
        if (attempt < this.SEND_RETRIES) await this.sleep(this.RETRY_DELAY_MS * attempt);
      }
    }
    this.logger.error(`Email send failed after ${this.SEND_RETRIES} attempts`);
    return { sent: false, error: lastError };
  }

  /**
   * Premium purchase receipt (transactional). Sent on every successful marketplace purchase.
   */
  async sendPurchaseConfirmation(to: string, pickTitle: string, amount: number, pickId?: number) {
    const appUrl = process.env.APP_URL || 'http://localhost:6002';
    const safeTitle = this.escapeEmailText(pickTitle);
    const ctaPath = pickId != null ? `/coupons/${pickId}` : '/my-purchases';
    const ctaUrl = `${appUrl}${ctaPath}`;
    const amountLabel = amount > 0 ? `GHS ${amount.toFixed(2)}` : 'Free pick';
    const subject = `Receipt · ${pickTitle}`;

    const inner = `${this.brandHeader('Purchase confirmed', 'You\'re in', 'Your pick is secured. Funds stay in escrow until the result is settled.')}
<tr>
  <td style="padding:8px 36px 28px;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f1f5f9;border-radius:14px;border:1px solid ${BR.line};">
      <tr>
        <td style="padding:20px 22px;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:${BR.muted};text-transform:uppercase;letter-spacing:0.06em;">Pick</p>
          <p style="margin:0;font-size:17px;font-weight:600;color:${BR.ink};line-height:1.4;">${safeTitle}</p>
          <p style="margin:16px 0 0;font-size:12px;font-weight:600;color:${BR.muted};text-transform:uppercase;letter-spacing:0.06em;">Amount</p>
          <p style="margin:6px 0 0;font-size:24px;font-weight:700;color:${BR.ink};letter-spacing:-0.02em;">${amountLabel}</p>
          ${amount > 0 ? `<p style="margin:14px 0 0;font-size:13px;color:${BR.muted};line-height:1.55;">Your wallet was debited; the tipster is paid after settlement minus platform fees where applicable.</p>` : ''}
        </td>
      </tr>
    </table>
    <div style="text-align:center;margin-top:26px;">
      <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(180deg,#d4af37,#b8941f);color:#0c1224;padding:14px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:15px;box-shadow:0 4px 14px rgba(201,162,39,0.35);">View pick</a>
    </div>
  </td>
</tr>`;

    const html = this.premiumDocument(inner);
    const text = `Purchase confirmed\n\nPick: ${pickTitle}\nAmount: ${amountLabel}\nFunds remain in escrow until settlement.\n\nOpen: ${ctaUrl}\n\n— BetRollover`;
    return this.send({ to, subject, text, html });
  }

  async sendPickApproved(to: string, pickTitle: string) {
    const safe = this.escapeEmailText(pickTitle);
    const inner = `${this.brandHeader('Marketplace', 'Pick live', `“${safe}” is on the marketplace.`)}
<tr><td style="padding:8px 36px 36px;text-align:center;">
  <p style="font-size:15px;color:${BR.muted};line-height:1.6;margin:0;">You’ll receive settlement and payout emails when results are in.</p>
</td></tr>`;
    return this.send({
      to,
      subject: `Pick approved: ${pickTitle}`,
      text: `Your pick "${pickTitle}" has been approved and is now live.`,
      html: this.premiumDocument(inner),
    });
  }

  async sendPickRejected(to: string, pickTitle: string) {
    const safe = this.escapeEmailText(pickTitle);
    const inner = `${this.brandHeader('Marketplace', 'Pick not published', `We couldn’t list “${safe}”.`)}
<tr><td style="padding:8px 36px 36px;text-align:center;">
  <p style="font-size:15px;color:${BR.muted};line-height:1.6;margin:0;">Contact support if you need more detail.</p>
</td></tr>`;
    return this.send({
      to,
      subject: `Pick not approved: ${pickTitle}`,
      text: `Your pick "${pickTitle}" was not approved.`,
      html: this.premiumDocument(inner),
    });
  }

  async sendTipsterApproved(to: string) {
    const inner = `${this.brandHeader('Tipster', 'Account active', 'You can create picks. Paid listings require meeting the platform minimum ROI.')}
<tr><td style="padding:8px 36px 36px;text-align:center;">
  <p style="font-size:15px;color:${BR.muted};line-height:1.6;margin:0;">Post free picks to build your record if you’re below the threshold.</p>
</td></tr>`;
    return this.send({
      to,
      subject: 'Your tipster account is active',
      text: 'Your tipster account is active. You can create picks. Paid picks require meeting the platform minimum ROI.',
      html: this.premiumDocument(inner),
    });
  }

  async sendTipsterRejected(to: string) {
    const inner = `${this.brandHeader('Tipster', 'Status update', 'We could not enable tipster selling on your account at this time.')}
<tr><td style="padding:8px 36px 36px;text-align:center;">
  <p style="font-size:15px;color:${BR.muted};line-height:1.6;margin:0;">Eligibility follows platform rules and ROI requirements. Reply via support if you have questions.</p>
</td></tr>`;
    return this.send({
      to,
      subject: 'Tipster status update',
      text: 'We could not enable tipster selling on your account. Contact support for details.',
      html: this.premiumDocument(inner),
    });
  }

  async sendRegistrationOtp(to: string, code: string) {
    const expiryMinutes = 10;
    const inner = `${this.brandHeader('Security', 'Verify it’s you', 'Enter the code below to finish signing up.')}
<tr>
  <td style="padding:8px 36px 32px;text-align:center;">
    <p style="font-size:36px;font-weight:800;letter-spacing:0.35em;color:${BR.ink};margin:8px 0 20px;">${this.escapeEmailText(code)}</p>
    <p style="font-size:13px;color:${BR.muted};margin:0;">Valid for ${expiryMinutes} minutes. Do not share this code.</p>
  </td>
</tr>`;
    return this.send({
      to,
      subject: 'Your BetRollover verification code',
      text: `Your verification code is: ${code}\n\nValid for ${expiryMinutes} minutes. Do not share this code.\n\n— BetRollover`,
      html: this.premiumDocument(inner),
    });
  }

  async sendPasswordResetOtp(to: string, code: string) {
    const expiryMinutes = 10;
    const appUrl = process.env.APP_URL || 'http://localhost:6002';
    const resetUrl = `${appUrl}/forgot-password?email=${encodeURIComponent(to)}&code=${code}`;
    const inner = `${this.brandHeader('Security', 'Reset your password', 'Use the code or the secure link below.')}
<tr>
  <td style="padding:8px 36px 28px;text-align:center;">
    <p style="font-size:34px;font-weight:800;letter-spacing:0.3em;color:${BR.ink};margin:8px 0 20px;">${this.escapeEmailText(code)}</p>
    <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(180deg,#d4af37,#b8941f);color:#0c1224;padding:14px 28px;text-decoration:none;border-radius:12px;font-weight:700;font-size:15px;">Open reset page</a>
    <p style="font-size:13px;color:${BR.muted};margin:20px 0 0;">Valid for ${expiryMinutes} minutes. If you didn’t request this, ignore this email.</p>
  </td>
</tr>`;
    return this.send({
      to,
      subject: 'BetRollover password reset code',
      text: `Your password reset code is: ${code}\n\nReset link: ${resetUrl}\n\nValid for ${expiryMinutes} minutes.\n\n— BetRollover`,
      html: this.premiumDocument(inner),
    });
  }

  async sendVerificationEmail(to: string, verifyUrl: string, displayName?: string) {
    const name = this.escapeEmailText(displayName || 'there');
    const inner = `${this.brandHeader('Account', 'Confirm your email', `Hi ${name}, one tap to unlock wallet and picks.`)}
<tr>
  <td style="padding:8px 36px 36px;text-align:center;">
    <a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(180deg,#d4af37,#b8941f);color:#0c1224;padding:14px 32px;text-decoration:none;border-radius:12px;font-weight:700;font-size:15px;">Verify email</a>
    <p style="font-size:12px;color:${BR.muted};margin:22px 0 0;word-break:break-all;">${this.escapeEmailText(verifyUrl)}</p>
    <p style="font-size:12px;color:${BR.muted};margin:16px 0 0;">Link expires in 24 hours.</p>
  </td>
</tr>`;
    return this.send({
      to,
      subject: 'Verify your BetRollover email',
      text: `Hi ${displayName || 'there'},\n\nVerify your email:\n${verifyUrl}\n\nExpires in 24 hours.\n\n— BetRollover`,
      html: this.premiumDocument(inner),
    });
  }

  async sendSettlement(to: string, pickTitle: string, won: boolean) {
    const safe = this.escapeEmailText(pickTitle);
    const inner = `${this.brandHeader('Settlement', won ? 'Pick won' : 'Pick settled', `“${safe}”`)}
<tr><td style="padding:8px 36px 36px;text-align:center;">
  <p style="font-size:15px;color:${BR.muted};line-height:1.6;margin:0;">${won ? 'Nice hit — check your wallet for any refunds or winnings.' : 'Refund processing depends on the result — see your purchases.'}</p>
</td></tr>`;
    return this.send({
      to,
      subject: won ? `Pick won: ${pickTitle}` : `Pick settled: ${pickTitle}`,
      text: won
        ? `Your purchased pick "${pickTitle}" won!`
        : `Your purchased pick "${pickTitle}" settled. Check your wallet for refunds if applicable.`,
      html: this.premiumDocument(inner),
    });
  }

  /**
   * In-app notification email with premium card + category accent bar.
   */
  async sendNotificationEmail(to: string, data: {
    type: string;
    title: string;
    message: string;
    link?: string | null;
    metadata?: Record<string, string>;
  }) {
    const appUrl = process.env.APP_URL || 'http://localhost:6002';
    const ctaUrl = data.link ? (data.link.startsWith('http') ? data.link : `${appUrl}${data.link}`) : appUrl;
    const subject = getEmailSubject(data.type, data.title, data.metadata);
    const ctaText = getCtaText(data.type);
    const accentColor = getCategoryColor(data.type);
    const safeMessage = (data.message || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    const safeTitle = this.escapeEmailText(data.title);

    const inner = `<tr>
  <td style="height:4px;background:${accentColor};"></td>
</tr>
<tr>
  <td style="padding:32px 32px 8px;text-align:center;">
    <div style="font-size:11px;font-weight:700;letter-spacing:0.22em;color:${accentColor};text-transform:uppercase;">BetRollover</div>
    <h1 style="font-size:20px;font-weight:700;color:${BR.ink};margin:12px 0 0;letter-spacing:-0.02em;">${safeTitle}</h1>
  </td>
</tr>
<tr>
  <td style="padding:8px 32px 28px;">
    <p style="font-size:16px;line-height:1.65;color:#334155;margin:0 0 22px;">${safeMessage}</p>
    ${data.link ? `
    <div style="text-align:center;">
      <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(180deg,${accentColor},${accentColor});color:#fff;padding:13px 26px;text-decoration:none;border-radius:12px;font-weight:600;font-size:15px;box-shadow:0 4px 14px rgba(15,23,42,0.12);">${ctaText}</a>
    </div>` : ''}
  </td>
</tr>
<tr>
  <td style="padding:18px 28px 28px;border-top:1px solid ${BR.line};">
    <p style="font-size:12px;color:#94a3b8;margin:0;">— BetRollover</p>
    <p style="font-size:11px;color:#cbd5e1;margin:8px 0 0 0;">Manage email preferences in your account settings.</p>
  </td>
</tr>`;

    const footNote =
      data.metadata?.followerAlert === '1'
        ? 'You received this because you follow this tipster.'
        : 'You received this because email notifications are enabled for your account.';
    const html = this.premiumDocument(inner, footNote);
    return this.send({
      to,
      subject,
      text: data.message,
      html,
    });
  }

  /**
   * Admin-only notification. Uses templates when type is provided.
   */
  async sendAdminNotification(
    data:
      | { type: AdminNotificationType; metadata: Record<string, unknown> }
      | { subject: string; message: string; link?: string },
  ) {
    const admins = await this.usersService.getAdminEmails();
    const settingsRow = await this.smtpRepo.findOne({ where: { id: 1 } });
    const envExtra = (process.env.ADMIN_NOTIFICATION_EMAIL || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const inbox = settingsRow?.adminNotificationEmail?.trim();
    const recipients = [...new Set([...admins, ...(inbox ? [inbox] : []), ...envExtra])];
    if (recipients.length === 0) return { sent: 0 };

    let subject: string;
    let message: string;
    let link: string;
    let ctaText: string;
    let accentColor: string;

    if ('type' in data && data.type in ADMIN_NOTIFICATION_TEMPLATES) {
      const tpl = ADMIN_NOTIFICATION_TEMPLATES[data.type as AdminNotificationType];
      const ctx = data.metadata as Record<string, unknown>;
      subject = tpl.subject(ctx as never);
      message = tpl.message(ctx as never);
      link = tpl.link;
      ctaText = tpl.ctaText;
      accentColor = tpl.accentColor;
    } else if ('subject' in data && 'message' in data) {
      subject = data.subject;
      message = data.message;
      link = data.link || '/admin';
      ctaText = 'View in Admin';
      accentColor = '#64748b';
    } else {
      return { sent: 0 };
    }

    const appUrl = process.env.APP_URL || 'http://localhost:6002';
    const ctaUrl = link.startsWith('http') ? link : `${appUrl}${link}`;
    const safeMessage = (message || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    const safeSubject = this.escapeEmailText(subject);

    const inner = `<tr>
  <td style="height:4px;background:${accentColor};"></td>
</tr>
<tr>
  <td style="padding:28px 32px 8px;text-align:center;">
    <div style="font-size:11px;font-weight:700;letter-spacing:0.22em;color:${accentColor};text-transform:uppercase;">Admin</div>
    <h1 style="font-size:18px;font-weight:700;color:${BR.adminInk};margin:12px 0 0;">${safeSubject}</h1>
  </td>
</tr>
<tr>
  <td style="padding:8px 32px 24px;">
    <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 20px;">${safeMessage}</p>
    <div style="text-align:center;">
      <a href="${ctaUrl}" style="display:inline-block;background:${accentColor};color:#fff;padding:13px 26px;text-decoration:none;border-radius:12px;font-weight:600;font-size:14px;">${ctaText}</a>
    </div>
  </td>
</tr>
<tr>
  <td style="padding:16px 28px 26px;border-top:1px solid ${BR.line};">
    <p style="font-size:11px;color:#94a3b8;margin:0;">BetRollover system message · not forwarded to users</p>
  </td>
</tr>`;

    const html = this.premiumDocument(inner);

    let sent = 0;
    for (const to of recipients) {
      const result = await this.send({ to, subject, text: message, html });
      if (result.sent) sent++;
    }
    return { sent };
  }
}
