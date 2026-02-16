import { Injectable } from '@nestjs/common';
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

@Injectable()
export class EmailService {
  constructor(
    @InjectRepository(SmtpSettings)
    private smtpRepo: Repository<SmtpSettings>,
    private usersService: UsersService,
  ) {}

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

  async send(options: { to: string; subject: string; text: string; html?: string }) {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (apiKey) {
      try {
        sgMail.setApiKey(apiKey);
        const from = await this.getFromWithSettings();
        await sgMail.send({
          to: options.to,
          from,
          subject: options.subject,
          text: options.text,
          html: options.html || options.text.replace(/\n/g, '<br>'),
        });
        return { sent: true };
      } catch (err: any) {
        console.error('SendGrid email error:', err?.response?.body || err);
        return { sent: false, error: String(err?.response?.body?.errors?.[0]?.message || err?.message || err) };
      }
    }

    const transporter = await this.getTransporter();
    if (!transporter) {
      console.warn('Email not configured. Set SENDGRID_API_KEY or SMTP settings. Skipping send.');
      return { sent: false, error: 'Email not configured' };
    }

    const from = await this.getFromWithSettings();
    try {
      await transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html || options.text.replace(/\n/g, '<br>'),
      });
      return { sent: true };
    } catch (err) {
      console.error('Email send error:', err);
      return { sent: false, error: String(err) };
    }
  }

  async sendPurchaseConfirmation(to: string, pickTitle: string, amount: number) {
    return this.send({
      to,
      subject: `Purchase confirmed: ${pickTitle}`,
      text: `You purchased "${pickTitle}" for GHS ${amount.toFixed(2)}. Funds are held in escrow until settlement.`,
    });
  }

  async sendPickApproved(to: string, pickTitle: string) {
    return this.send({
      to,
      subject: `Pick approved: ${pickTitle}`,
      text: `Your pick "${pickTitle}" has been approved and is now live on the marketplace.`,
    });
  }

  async sendPickRejected(to: string, pickTitle: string) {
    return this.send({
      to,
      subject: `Pick not approved: ${pickTitle}`,
      text: `Your pick "${pickTitle}" was not approved.`,
    });
  }

  async sendTipsterApproved(to: string) {
    return this.send({
      to,
      subject: 'Tipster request approved',
      text: 'Your tipster request has been approved. You can now create and sell picks!',
    });
  }

  async sendTipsterRejected(to: string) {
    return this.send({
      to,
      subject: 'Tipster request not approved',
      text: 'Your tipster request was not approved. Contact support for more info.',
    });
  }

  async sendRegistrationOtp(to: string, code: string) {
    const expiryMinutes = 10;
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your verification code</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;padding:32px 16px;">
    <tr>
      <td style="background:#fff;border-radius:16px;padding:40px;box-shadow:0 4px 6px rgba(0,0,0,0.1);text-align:center;">
        <div style="font-size:22px;font-weight:700;color:#0f172a;margin-bottom:8px;">BetRollover</div>
        <p style="font-size:16px;color:#64748b;margin:0 0 24px;">Enter this code to complete your registration:</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#10b981;margin:16px 0;">${code}</p>
        <p style="font-size:13px;color:#94a3b8;">Valid for ${expiryMinutes} minutes. Do not share this code.</p>
        <p style="font-size:12px;color:#cbd5e1;margin-top:32px;">— BetRollover Team</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
    return this.send({
      to,
      subject: 'Your BetRollover verification code',
      text: `Your verification code is: ${code}\n\nValid for ${expiryMinutes} minutes. Do not share this code.\n\n— BetRollover`,
      html,
    });
  }

  async sendVerificationEmail(to: string, verifyUrl: string, displayName?: string) {
    const name = displayName || 'there';
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;padding:32px 16px;">
    <tr>
      <td style="background:#fff;border-radius:16px;padding:40px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
        <div style="font-size:22px;font-weight:700;color:#0f172a;margin-bottom:8px;">BetRollover</div>
        <p style="font-size:16px;color:#334155;margin:0 0 24px;">Hi ${name},</p>
        <p style="font-size:16px;color:#64748b;margin:0 0 24px;">Please verify your email by clicking the button below:</p>
        <a href="${verifyUrl}" style="display:inline-block;background:#10b981;color:#fff;padding:14px 28px;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;">Verify Email</a>
        <p style="font-size:13px;color:#94a3b8;margin-top:24px;">Or copy this link: ${verifyUrl}</p>
        <p style="font-size:12px;color:#cbd5e1;margin-top:32px;">The link expires in 24 hours.<br>— BetRollover Team</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
    return this.send({
      to,
      subject: 'Verify your BetRollover email',
      text: `Hi ${name},\n\nPlease verify your email by clicking this link:\n${verifyUrl}\n\nThe link expires in 24 hours.\n\n— BetRollover`,
      html,
    });
  }

  async sendSettlement(to: string, pickTitle: string, won: boolean) {
    return this.send({
      to,
      subject: won ? `Pick won: ${pickTitle}` : `Pick settled: ${pickTitle}`,
      text: won
        ? `Your purchased pick "${pickTitle}" won!`
        : `Your purchased pick "${pickTitle}" lost. Refund has been sent to your wallet.`,
    });
  }

  /**
   * Send a notification email with professional HTML template.
   * Uses notification-types.config for subject, CTA text, and category-based styling.
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
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',sans-serif;background:#f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <tr>
      <td>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -2px rgba(0,0,0,0.1);overflow:hidden;">
          <tr>
            <td style="background:${accentColor};padding:24px 32px;text-align:center;">
              <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">BetRollover</div>
              <div style="font-size:13px;color:rgba(255,255,255,0.9);margin-top:4px;">${data.title}</div>
            </tr>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="font-size:16px;line-height:1.65;color:#334155;margin:0 0 24px;">${safeMessage}</p>
              ${data.link ? `
              <a href="${ctaUrl}" style="display:inline-block;background:${accentColor};color:#fff;padding:14px 28px;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;">${ctaText}</a>
              ` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #e2e8f0;">
              <p style="font-size:12px;color:#94a3b8;margin:0;">— BetRollover Team</p>
              <p style="font-size:11px;color:#cbd5e1;margin:8px 0 0 0;">Manage email preferences in your account settings.</p>
            </td>
          </tr>
        </table>
        <p style="font-size:11px;color:#94a3b8;text-align:center;margin-top:24px;">You received this because you have email notifications enabled.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
    return this.send({
      to,
      subject,
      text: data.message,
      html,
    });
  }

  /**
   * Send admin-only notification. Uses templates when type is provided.
   * Sends to all users with role=admin.
   */
  async sendAdminNotification(
    data:
      | { type: AdminNotificationType; metadata: Record<string, unknown> }
      | { subject: string; message: string; link?: string },
  ) {
    const admins = await this.usersService.getAdminEmails();
    if (admins.length === 0) return { sent: 0 };

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
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <tr>
      <td>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;box-shadow:0 4px 6px rgba(0,0,0,0.1);overflow:hidden;">
          <tr>
            <td style="background:${accentColor};padding:24px 32px;text-align:center;">
              <div style="font-size:22px;font-weight:700;color:#ffffff;">BetRollover Admin</div>
              <div style="font-size:13px;color:rgba(255,255,255,0.9);margin-top:4px;">${subject}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="font-size:16px;line-height:1.65;color:#334155;margin:0 0 24px;">${safeMessage}</p>
              <a href="${ctaUrl}" style="display:inline-block;background:${accentColor};color:#fff;padding:14px 28px;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;">${ctaText}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #e2e8f0;">
              <p style="font-size:12px;color:#94a3b8;margin:0;">— BetRollover System</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    let sent = 0;
    for (const to of admins) {
      const result = await this.send({ to, subject, text: message, html });
      if (result.sent) sent++;
    }
    return { sent };
  }
}
