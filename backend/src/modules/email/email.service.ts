import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { SmtpSettings } from './entities/smtp-settings.entity';
import { UsersService } from '../users/users.service';
import {
  getEmailSubject,
  getCtaText,
  getCategoryEyebrow,
} from '../notifications/notification-types.config';
import {
  ADMIN_NOTIFICATION_TEMPLATES,
  AdminNotificationType,
} from './admin-notification-templates.config';
import {
  couponEmailHeadline,
  couponUserFacingRef,
  truncateCouponTitleForSubject,
} from '../../common/coupon-public-label';

/** Transactional palette — white page, gold accent. Avoid non-white page bg: Gmail dark mode inverts it to navy. */
const BR = {
  pageBg: '#ffffff',
  cardBg: '#ffffff',
  gold: '#c9a227',
  ink: '#0f172a',
  muted: '#64748b',
  line: '#e2e8f0',
} as const;

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @InjectRepository(SmtpSettings)
    private smtpRepo: Repository<SmtpSettings>,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
  ) { }

  private escapeEmailText(s: string): string {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private escapeHtmlAttr(s: string): string {
    return (s || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;');
  }

  /** Public logo on APP_URL; override with EMAIL_LOGO_URL if needed (absolute URL). */
  private getLogoUrl(): string {
    const custom = process.env.EMAIL_LOGO_URL?.trim();
    if (custom) return custom;
    return `${this.appOrigin()}/BetRollover-logo.png`;
  }

  private appOrigin(): string {
    return (process.env.APP_URL || 'https://betrollover.com').replace(/\/$/, '');
  }

  private prefsUrl(): string {
    return `${this.appOrigin()}/profile#notification-preferences`;
  }

  /**
   * Shared shell: light page, gold hairline, white card, legal footer.
   */
  private premiumDocument(innerRows: string, footerExtra?: string): string {
    const prefs = this.escapeHtmlAttr(this.prefsUrl());
    const year = new Date().getUTCFullYear();
    const extra = footerExtra
      ? `<p style="font-size:11px;color:${BR.muted};margin:10px 0 0;text-align:center;line-height:1.5;">${footerExtra}</p>`
      : '';
    return `<!DOCTYPE html>
<html lang="en" style="background-color:${BR.pageBg};">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="color-scheme" content="light only"/>
  <meta name="supported-color-schemes" content="light"/>
  <title>BetRollover</title>
  <style type="text/css">
    :root { color-scheme: light only; }
    html, body { background-color: ${BR.pageBg} !important; }
    [data-ogsb] body, [data-ogsc] body { background-color: ${BR.pageBg} !important; }
  </style>
</head>
<body class="body" style="margin:0;padding:0;background-color:${BR.pageBg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;" bgcolor="${BR.pageBg}">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" bgcolor="${BR.pageBg}" style="background-color:${BR.pageBg};padding:32px 12px;">
    <tr>
      <td align="center" bgcolor="${BR.pageBg}" style="background-color:${BR.pageBg};">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" bgcolor="${BR.cardBg}" style="max-width:520px;background-color:${BR.cardBg};border-radius:16px;overflow:hidden;border:1px solid ${BR.line};">
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#8b6914,#e8d48b,#c9a227,#e8d48b,#8b6914);"></td>
          </tr>
          ${innerRows}
        </table>
        <p style="font-size:11px;color:${BR.muted};margin:22px 8px 0;text-align:center;line-height:1.7;">
          18+ · Informational only — not betting advice.<br/>
          <a href="${prefs}" style="color:${BR.gold};text-decoration:none;">Notification settings</a>
          &nbsp;·&nbsp;© ${year} BetRollover
        </p>
        ${extra}
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private brandHeader(eyebrow: string, title: string, subtitle?: string): string {
    const logoSrc = this.escapeHtmlAttr(this.getLogoUrl());
    const sub = subtitle
      ? `<p style="font-size:15px;color:${BR.muted};margin:12px 0 0;line-height:1.55;">${subtitle}</p>`
      : '';
    return `<tr>
  <td style="padding:28px 32px 0;text-align:center;">
    <img src="${logoSrc}" alt="BetRollover" width="128" style="max-width:148px;width:128px;height:auto;display:block;margin:0 auto;border:0;outline:none;" />
  </td>
</tr>
<tr>
  <td style="padding:18px 32px 8px;text-align:center;">
    <div style="font-size:11px;font-weight:700;letter-spacing:0.22em;color:${BR.gold};text-transform:uppercase;">${eyebrow}</div>
    <h1 style="font-size:22px;font-weight:700;color:${BR.ink};margin:12px 0 0;letter-spacing:-0.03em;line-height:1.25;">${title}</h1>
    ${sub}
  </td>
</tr>`;
  }

  private ctaButton(href: string, label: string): string {
    return `<div style="text-align:center;margin:8px 0 4px;">
  <a href="${this.escapeHtmlAttr(href)}" style="display:inline-block;background:linear-gradient(180deg,#e8d48b,#c9a227);color:#0c1224;padding:14px 28px;text-decoration:none;border-radius:999px;font-weight:700;font-size:14px;letter-spacing:0.01em;">${this.escapeEmailText(label)}</a>
</div>`;
  }

  private bodyCell(innerHtml: string): string {
    return `<tr><td style="padding:8px 32px 32px;">${innerHtml}</td></tr>`;
  }

  private copyP(html: string): string {
    return `<p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 20px;">${html}</p>`;
  }

  private insetCard(innerHtml: string): string {
    return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f8fafc;border-radius:16px;border:1px solid ${BR.line};margin:0 0 20px;">
  <tr><td style="padding:18px 20px;">${innerHtml}</td></tr>
</table>`;
  }

  private async getFromWithSettings(): Promise<string> {
    const settings = await this.smtpRepo.findOne({ where: { id: 1 } });
    const from = process.env.SMTP_FROM || (settings ? `"${settings.fromName}" <${settings.fromEmail}>` : '"BetRollover" <noreply@betrollover.com>');
    return from;
  }

  private async getTransporter() {
    const settings = await this.smtpRepo.findOne({ where: { id: 1 } });
    const password =
      process.env.SMTP_PASSWORD || settings?.password || process.env.RESEND_API_KEY;
    if (!password) return null;

    const host = process.env.SMTP_HOST || settings?.host || 'smtp.resend.com';
    const port = parseInt(process.env.SMTP_PORT || String(settings?.port || 465), 10);
    const secure = port === 465;
    const user = process.env.SMTP_USERNAME || settings?.username || 'resend';

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
    const to = (options.to || '').trim().toLowerCase();
    if (!to || to.endsWith('@betrollover.internal')) {
      return { sent: false, error: 'Skipped internal or empty recipient' };
    }

    const apiKey = (process.env.RESEND_API_KEY || '').trim();
    if (apiKey) {
      return this.sendViaResend(options, apiKey);
    }

    const transporter = await this.getTransporter();
    if (!transporter) {
      this.logger.error(
        'CRITICAL: Email not configured. Set RESEND_API_KEY (or SMTP_HOST + SMTP_PASSWORD). Registration OTP will fail.',
      );
      return { sent: false, error: 'Email configuration missing on server' };
    }

    return this.sendViaSmtp(options, transporter);
  }

  async sendCampaignEmail(data: {
    to: string;
    subject: string;
    eyebrow: string;
    title: string;
    body: string;
    ctaLabel: string;
    ctaPath: string;
    extraHtml?: string;
    extraText?: string;
  }): Promise<{ sent: boolean; error?: string }> {
    const ctaUrl = `${this.appOrigin()}${data.ctaPath.startsWith('/') ? data.ctaPath : `/${data.ctaPath}`}`;
    const inner = `${this.brandHeader(this.escapeEmailText(data.eyebrow), this.escapeEmailText(data.title))}
${this.bodyCell(`${this.copyP(this.escapeEmailText(data.body))}${data.extraHtml || ''}${this.ctaButton(ctaUrl, data.ctaLabel)}`)}`;
    const html = this.premiumDocument(
      inner,
      'Optional updates. Turn these off anytime in Profile → product emails.',
    );
    const extra = data.extraText ? `\n\n${data.extraText}` : '';
    const text = `${data.title}\n\n${data.body}${extra}\n\n${ctaUrl}\n\n18+ Informational only.\n— BetRollover`;
    return this.send({ to: data.to, subject: data.subject, text, html });
  }

  async sendFreeTipDigestEmail(
    to: string,
    tips: Array<{ id: number; title: string; tipsterName: string; totalOdds: number; totalPicks: number }>,
  ): Promise<{ sent: boolean; error?: string }> {
    const slice = tips.slice(0, 4);
    const cards = slice
      .map((tip) => {
        const title = this.escapeEmailText(tip.title || `Pick #${tip.id}`);
        const name = this.escapeEmailText(tip.tipsterName || 'Tipster');
        const odds = Number(tip.totalOdds || 0).toFixed(2);
        const legs = Number(tip.totalPicks || 0);
        return this.insetCard(
          `<p style="margin:0;font-size:15px;font-weight:700;color:${BR.ink};">${title}</p>
           <p style="margin:6px 0 0;font-size:13px;color:${BR.muted};">${name} · ${legs} legs · ${odds} combined</p>`,
        );
      })
      .join('');
    const extraText = slice
      .map((tip) => {
        const odds = Number(tip.totalOdds || 0).toFixed(2);
        return `- ${tip.title || `Pick #${tip.id}`} (${tip.tipsterName || 'Tipster'}) · ${odds}`;
      })
      .join('\n');
    return this.sendCampaignEmail({
      to,
      subject: 'Today’s free tips',
      eyebrow: 'Free Tip of the Day',
      title: 'Ranked free slips, still to kick off',
      body: 'These are live free marketplace picks from tipsters with a positive record. Informational only — 18+. You pick your own legs; we don’t stake for you.',
      ctaLabel: 'View on the homepage',
      ctaPath: '/#free-tip-of-the-day',
      extraHtml: cards,
      extraText,
    });
  }

  async sendWeeklyRecapEmail(
    to: string,
    slips: Array<{
      id: number;
      title: string;
      result: 'won' | 'lost';
      tipsterName: string;
      totalOdds: number;
      totalPicks: number;
    }>,
    summary: { won: number; lost: number },
  ): Promise<{ sent: boolean; error?: string }> {
    const slice = slips.slice(0, 5);
    const tally = `${summary.won} won · ${summary.lost} lost`;
    const summaryCard = this.insetCard(
      `<p style="margin:0;font-size:15px;font-weight:700;color:${BR.ink};">${this.escapeEmailText(tally)}</p>
       <p style="margin:6px 0 0;font-size:13px;color:${BR.muted};">Past settled results on BetRollover — not a forecast.</p>`,
    );
    const cards = slice
      .map((slip) => {
        const title = this.escapeEmailText(slip.title || `Pick #${slip.id}`);
        const name = this.escapeEmailText(slip.tipsterName || 'Tipster');
        const result = slip.result === 'won' ? 'Won' : 'Lost';
        const resultColor = slip.result === 'won' ? BR.gold : BR.muted;
        const odds = Number(slip.totalOdds || 0).toFixed(2);
        return this.insetCard(
          `<p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${resultColor};">${result}</p>
           <p style="margin:8px 0 0;font-size:15px;font-weight:700;color:${BR.ink};">${title}</p>
           <p style="margin:6px 0 0;font-size:13px;color:${BR.muted};">${name} · ${Number(slip.totalPicks || 0)} legs · ${odds} combined</p>`,
        );
      })
      .join('');
    const extraText = [`${tally} (past results, not a forecast)`, ...slice.map((s) => `- ${s.result === 'won' ? 'Won' : 'Lost'}: ${s.title} (${s.tipsterName})`)].join('\n');
    return this.sendCampaignEmail({
      to,
      subject: 'Your week on BetRollover',
      eyebrow: 'Weekly recap',
      title: 'Settled results, last 7 days',
      body: 'Slips you bought or follow that settled this week. Informational only — 18+. Past results are not a forecast; we don’t stake for you.',
      ctaLabel: 'Open the archive',
      ctaPath: '/coupons/archive',
      extraHtml: `${summaryCard}${cards}`,
      extraText,
    });
  }

  async sendAccaDeskShortsEmail(
    to: string,
    shorts: Array<{
      ticketId: number;
      title: string;
      tipsterName: string;
      totalOdds: number;
      legs: Array<{ matchDescription: string; prediction: string; odds: number }>;
    }>,
  ): Promise<{ sent: boolean; error?: string }> {
    const slice = shorts.slice(0, 12);
    const cards = slice
      .map((slip) => {
        const title = this.escapeEmailText(slip.title || `Pick #${slip.ticketId}`);
        const name = this.escapeEmailText(slip.tipsterName || 'Acca Desk');
        const odds = Number(slip.totalOdds || 0).toFixed(2);
        const legs = (slip.legs || [])
          .slice(0, 2)
          .map((leg) => {
            const match = this.escapeEmailText(leg.matchDescription || 'Match');
            const pick = this.escapeEmailText(leg.prediction || '');
            const legOdds = Number(leg.odds || 0).toFixed(2);
            return `<p style="margin:4px 0 0;font-size:13px;color:${BR.muted};">${match} · ${pick} @ ${legOdds}</p>`;
          })
          .join('');
        return this.insetCard(
          `<p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${BR.gold};">${name}</p>
           <p style="margin:8px 0 0;font-size:15px;font-weight:700;color:${BR.ink};">${title}</p>
           <p style="margin:6px 0 0;font-size:13px;color:${BR.muted};">2-fold · ${odds} combined</p>
           ${legs}`,
        );
      })
      .join('');
    const extraText = slice
      .map((slip) => {
        const odds = Number(slip.totalOdds || 0).toFixed(2);
        const legs = (slip.legs || [])
          .slice(0, 2)
          .map((leg) => `  ${leg.matchDescription} · ${leg.prediction}`)
          .join('\n');
        return `- ${slip.tipsterName}: ${slip.title} @ ${odds}\n${legs}`;
      })
      .join('\n');
    return this.sendCampaignEmail({
      to,
      subject: 'Today’s Acca Desk shorts',
      eyebrow: 'Acca Desk',
      title: 'Two-fold shorts from tipsters you follow',
      body: 'Acca Desk posts early / afternoon / evening 2-folds. Informational only — 18+. Educational odd bands, not a guarantee. You pick your own legs; we don’t stake for you.',
      ctaLabel: 'Browse marketplace',
      ctaPath: '/marketplace',
      extraHtml: cards,
      extraText,
    });
  }

  private async sendViaResend(
    options: { to: string; subject: string; text: string; html?: string },
    apiKey: string,
  ): Promise<{ sent: boolean; error?: string }> {
    const from = await this.getFromWithSettings();
    const payload = {
      from,
      to: [options.to],
      subject: options.subject,
      text: options.text,
      html: options.html || options.text.replace(/\n/g, '<br>'),
    };

    let lastError: string | undefined;
    for (let attempt = 1; attempt <= this.SEND_RETRIES; attempt++) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        const body = (await res.json().catch(() => ({}))) as {
          message?: string;
          name?: string;
        };
        if (res.ok) return { sent: true };

        lastError = String(body.message || body.name || `Resend HTTP ${res.status}`);
        this.logger.warn(`Resend attempt ${attempt}/${this.SEND_RETRIES} failed: ${lastError}`);
        const nonRetryable =
          res.status === 401 ||
          res.status === 403 ||
          res.status === 422 ||
          /invalid api key|not authorized|unverified|validation/i.test(lastError);
        if (nonRetryable) {
          this.logger.error(
            `Resend rejected send (non-retryable): ${lastError}. Verify domain and SMTP_FROM for: ${from}`,
          );
          return { sent: false, error: lastError };
        }
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Resend attempt ${attempt}/${this.SEND_RETRIES} failed: ${lastError}`);
      }
      if (attempt < this.SEND_RETRIES) await this.sleep(this.RETRY_DELAY_MS * attempt);
    }
    this.logger.error(`Resend email failed after ${this.SEND_RETRIES} attempts`);
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
  async sendPurchaseConfirmation(to: string, amount: number, pickId: number, pickTitle?: string | null) {
    const ctaUrl = `${this.appOrigin()}/coupons/${pickId}`;
    const ref = couponUserFacingRef(pickId, pickTitle);
    const safeRef = this.escapeEmailText(ref);
    const amountLabel = amount > 0 ? `GHS ${amount.toFixed(2)}` : 'Free pick';
    const subject = `Receipt · ${this.escapeEmailText(couponEmailHeadline(pickId, pickTitle))}`;
    const inner = `${this.brandHeader('Receipt', 'Purchase confirmed', 'Your pick is secured. Funds stay in escrow until settlement.')}
${this.bodyCell(`
  ${this.insetCard(`
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:${BR.muted};text-transform:uppercase;letter-spacing:0.08em;">Pick</p>
    <p style="margin:0;font-size:16px;font-weight:600;color:${BR.ink};line-height:1.4;">${safeRef}</p>
    <p style="margin:16px 0 6px;font-size:11px;font-weight:700;color:${BR.muted};text-transform:uppercase;letter-spacing:0.08em;">Amount</p>
    <p style="margin:0;font-size:26px;font-weight:700;color:${BR.ink};letter-spacing:-0.03em;">${amountLabel}</p>
    ${amount > 0 ? `<p style="margin:14px 0 0;font-size:13px;color:${BR.muted};line-height:1.55;">Wallet debited now. The tipster is paid after the result, minus platform fees where applicable.</p>` : ''}
  `)}
  ${this.ctaButton(ctaUrl, 'View pick')}
`)}`;
    const text = `Purchase confirmed\n\n${ref}\nAmount: ${amountLabel}\nFunds remain in escrow until settlement.\n\nOpen: ${ctaUrl}\n\n18+ Informational only.\n— BetRollover`;
    return this.send({ to, subject, text, html: this.premiumDocument(inner) });
  }

  async sendPickApproved(to: string, _pickTitleUnused?: string) {
    const ctaUrl = `${this.appOrigin()}/marketplace`;
    const inner = `${this.brandHeader('Marketplace', 'Your pick is live', 'It’s listed for buyers. You’ll get settlement mail when results are in.')}
${this.bodyCell(`${this.copyP('Share your profile so followers can find the slip.')}${this.ctaButton(ctaUrl, 'Open marketplace')}`)}`;
    return this.send({
      to,
      subject: 'Your pick is live',
      text: `Your pick is live on the marketplace.\n${ctaUrl}\n\n18+ Informational only.\n— BetRollover`,
      html: this.premiumDocument(inner),
    });
  }

  async sendPickRejected(to: string, _pickTitleUnused?: string) {
    const ctaUrl = `${this.appOrigin()}/support`;
    const inner = `${this.brandHeader('Marketplace', 'Pick not published', 'This slip did not meet listing rules.')}
${this.bodyCell(`${this.copyP('Check your picks, then try again. Support can explain if something looks wrong.')}${this.ctaButton(ctaUrl, 'Contact support')}`)}`;
    return this.send({
      to,
      subject: 'Pick not published',
      text: `Your pick was not published. Contact support if you need detail.\n${ctaUrl}\n\n— BetRollover`,
      html: this.premiumDocument(inner),
    });
  }

  async sendTipsterApproved(to: string) {
    const ctaUrl = `${this.appOrigin()}/create-pick`;
    const inner = `${this.brandHeader('Tipster', 'You’re approved', 'Create picks and track ROI. Paid listings need the platform minimum ROI.')}
${this.bodyCell(`${this.copyP('Start with free slips if you’re still building a record.')}${this.ctaButton(ctaUrl, 'Create a pick')}`)}`;
    return this.send({
      to,
      subject: 'You’re approved as a tipster',
      text: `Your tipster account is active. Create picks at ${ctaUrl}\nPaid picks require the platform minimum ROI.\n\n18+ Informational only.\n— BetRollover`,
      html: this.premiumDocument(inner),
    });
  }

  async sendTipsterRejected(to: string) {
    const ctaUrl = `${this.appOrigin()}/support`;
    const inner = `${this.brandHeader('Tipster', 'Selling not enabled', 'We could not turn on tipster selling on this account right now.')}
${this.bodyCell(`${this.copyP('Eligibility follows platform rules and ROI. Support can walk you through next steps.')}${this.ctaButton(ctaUrl, 'Contact support')}`)}`;
    return this.send({
      to,
      subject: 'Tipster status update',
      text: `Tipster selling is not enabled on your account. ${ctaUrl}\n\n— BetRollover`,
      html: this.premiumDocument(inner),
    });
  }

  async sendPasswordResetOtp(to: string, code: string) {
    const expiryMinutes = 10;
    const resetUrl = `${this.appOrigin()}/forgot-password?email=${encodeURIComponent(to)}&code=${code}`;
    const inner = `${this.brandHeader('Security', 'Reset your password', 'Use the code or open the secure link. Ignore this if you didn’t ask for a reset.')}
${this.bodyCell(`
  <p style="font-size:32px;font-weight:800;letter-spacing:0.28em;color:${BR.ink};margin:4px 0 22px;text-align:center;">${this.escapeEmailText(code)}</p>
  ${this.ctaButton(resetUrl, 'Open reset page')}
  <p style="font-size:13px;color:${BR.muted};margin:18px 0 0;text-align:center;">Valid for ${expiryMinutes} minutes.</p>
`)}`;
    return this.send({
      to,
      subject: 'Reset your BetRollover password',
      text: `Your password reset code is: ${code}\n\nReset link: ${resetUrl}\nValid for ${expiryMinutes} minutes.\n\n— BetRollover`,
      html: this.premiumDocument(inner),
    });
  }

  async sendVerificationEmail(to: string, verifyUrl: string, displayName?: string) {
    const name = this.escapeEmailText(displayName || 'there');
    const inner = `${this.brandHeader('Account', 'Confirm your email', `Hi ${name} — one tap to finish setup.`)}
${this.bodyCell(`${this.copyP('This unlocks wallet, picks, and notifications.')}${this.ctaButton(verifyUrl, 'Verify email')}<p style="font-size:12px;color:${BR.muted};margin:18px 0 0;word-break:break-all;text-align:center;">${this.escapeEmailText(verifyUrl)}</p><p style="font-size:12px;color:${BR.muted};margin:10px 0 0;text-align:center;">Link expires in 24 hours.</p>`)}`;
    return this.send({
      to,
      subject: 'Confirm your BetRollover email',
      text: `Hi ${displayName || 'there'},\n\nVerify your email:\n${verifyUrl}\n\nExpires in 24 hours.\n\n— BetRollover`,
      html: this.premiumDocument(inner),
    });
  }

  async sendSettlement(to: string, pickId: number, won: boolean, pickTitle?: string | null) {
    const ref = couponUserFacingRef(pickId, pickTitle);
    const ctaUrl = `${this.appOrigin()}/my-purchases`;
    const inner = `${this.brandHeader(
      'Settlement',
      won ? 'This pick won' : 'This pick settled',
      this.escapeEmailText(ref),
    )}
${this.bodyCell(`${this.copyP(won ? 'Check purchases for the result card. Wallet updates follow platform settlement rules.' : 'See purchases for the result. Refunds, if any, follow the coupon rules.')}${this.ctaButton(ctaUrl, 'View purchases')}`)}`;
    return this.send({
      to,
      subject: won
        ? `Won · ${this.escapeEmailText(couponEmailHeadline(pickId, pickTitle))}`
        : `Settled · ${this.escapeEmailText(couponEmailHeadline(pickId, pickTitle))}`,
      text: won
        ? `Your purchased pick (${ref}) won.\n${ctaUrl}\n\n18+ Informational only.\n— BetRollover`
        : `Your purchased pick (${ref}) settled. ${ctaUrl}\n\n18+ Informational only.\n— BetRollover`,
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
    const ctaUrl = data.link
      ? data.link.startsWith('http')
        ? data.link
        : `${this.appOrigin()}${data.link}`
      : this.appOrigin();
    const subject = getEmailSubject(data.type, data.title, data.metadata);
    const ctaText = getCtaText(data.type);
    const eyebrow = getCategoryEyebrow(data.type);
    const safeMessage = this.escapeEmailText(data.message || '').replace(/\n/g, '<br>');
    const headline = this.escapeEmailText(subject);
    const tipsterFormLine = data.metadata?.tipsterForm
      ? this.insetCard(
          `<p style="margin:0;font-size:13px;color:${BR.muted};">${this.escapeEmailText(data.metadata.tipsterForm)}</p>
           <p style="margin:8px 0 0;font-size:11px;color:${BR.muted};">Stats from settled picks on BetRollover. Form can change.</p>`,
        )
      : '';
    const isPickSocial = data.type.startsWith('pick_comment');
    const actorName = data.metadata?.actorName?.trim();
    const pickLabel = data.metadata?.pickLabel?.trim() || data.metadata?.pickTitle?.trim();
    const socialContextLine =
      isPickSocial && actorName
        ? this.insetCard(
            `<p style="margin:0;font-size:14px;color:${BR.ink};"><strong>${this.escapeEmailText(actorName)}</strong>${
              pickLabel ? ` · ${this.escapeEmailText(pickLabel)}` : ''
            }</p>`,
          )
        : '';

    const inner = `${this.brandHeader(eyebrow, headline)}
${this.bodyCell(`
  ${tipsterFormLine}
  ${socialContextLine}
  ${this.copyP(safeMessage)}
  ${data.link ? this.ctaButton(ctaUrl, ctaText) : ''}
`)}`;

    const footNote =
      data.metadata?.followerAlert === '1'
        ? 'You get this because you follow this tipster.'
        : undefined;
    return this.send({
      to,
      subject,
      text: `${subject}\n\n${data.message}\n${data.link ? `\n${ctaUrl}` : ''}\n\n18+ Informational only.\n— BetRollover`,
      html: this.premiumDocument(inner, footNote),
    });
  }

  /**
   * Rich pick-card email used for new pick alerts.
   * Includes full leg details so users can read without opening the app.
   */
  async sendCouponCardEmail(
    to: string,
    data: {
      tipsterName: string;
      accumulatorId: number;
      couponTitle: string;
      tipsterForm?: string;
      tipsterFormAsOf?: string;
      totalOdds: number;
      price: number;
      link: string;
      legs: Array<{
        matchDescription: string;
        prediction: string;
        odds: number;
        matchDate?: string | null;
      }>;
      isSubscription?: boolean;
    },
  ) {
    const ctaUrl = data.link.startsWith('http') ? data.link : `${this.appOrigin()}${data.link}`;
    const tipsterName = this.escapeEmailText(data.tipsterName || 'Tipster');
    const couponHeadline = this.escapeEmailText(couponEmailHeadline(data.accumulatorId, data.couponTitle));
    const priceLabel = Number(data.price) > 0 ? `GHS ${Number(data.price).toFixed(2)}` : 'Free';
    const totalOddsLabel = Number(data.totalOdds || 0).toFixed(2);
    const accessLabel = data.isSubscription ? 'Subscribers only' : 'Public marketplace';
    const asOfLabel = data.tipsterFormAsOf
      ? new Date(data.tipsterFormAsOf).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
      : null;
    const tipsterFormLine = data.tipsterForm
      ? this.insetCard(
          `<p style="margin:0;font-size:13px;color:${BR.muted};">${this.escapeEmailText(data.tipsterForm)}</p>
          ${asOfLabel ? `<p style="margin:6px 0 0;font-size:11px;color:${BR.muted};">As of ${this.escapeEmailText(asOfLabel)}</p>` : ''}
          <p style="margin:6px 0 0;font-size:11px;color:${BR.muted};">Settled results on BetRollover. Form can change.</p>`,
        )
      : '';

    const legsHtml = (data.legs || [])
      .slice(0, 20)
      .map((leg, idx) => {
        const match = this.escapeEmailText(leg.matchDescription || 'Match');
        const prediction = this.escapeEmailText(leg.prediction || 'Prediction');
        const odds = Number(leg.odds || 0).toFixed(2);
        const kickoff = leg.matchDate
          ? new Date(leg.matchDate).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
          : null;
        return `<tr>
  <td style="padding:12px 0;${idx === 0 ? '' : `border-top:1px solid ${BR.line};`}">
    <p style="margin:0;font-size:13px;font-weight:700;color:${BR.ink};">${idx + 1}. ${match}</p>
    <p style="margin:5px 0 0;font-size:13px;color:#334155;">${prediction} · <strong>@ ${odds}</strong></p>
    ${kickoff ? `<p style="margin:5px 0 0;font-size:12px;color:${BR.muted};">${this.escapeEmailText(kickoff)}</p>` : ''}
  </td>
</tr>`;
      })
      .join('');

    const inner = `${this.brandHeader('New pick', couponHeadline, `${tipsterName} just posted.`)}
${this.bodyCell(`
  ${tipsterFormLine}
  ${this.insetCard(`
    <p style="margin:0;font-size:11px;font-weight:700;color:${BR.muted};text-transform:uppercase;letter-spacing:0.08em;">Access</p>
    <p style="margin:6px 0 0;font-size:15px;font-weight:700;color:${BR.ink};">${this.escapeEmailText(accessLabel)}</p>
    <p style="margin:14px 0 0;font-size:11px;font-weight:700;color:${BR.muted};text-transform:uppercase;letter-spacing:0.08em;">Price · Combined odds</p>
    <p style="margin:6px 0 0;font-size:20px;font-weight:700;color:${BR.ink};letter-spacing:-0.03em;">${this.escapeEmailText(priceLabel)} · ${this.escapeEmailText(totalOddsLabel)}</p>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:8px;">
      ${legsHtml || `<tr><td style="padding:12px 0;font-size:13px;color:${BR.muted};">No legs listed.</td></tr>`}
    </table>
  `)}
  ${this.ctaButton(ctaUrl, 'Open pick')}
`)}`;

    const html = this.premiumDocument(inner, 'You get this because pick alerts are on for your account.');
    const textLegs = (data.legs || [])
      .slice(0, 20)
      .map(
        (leg, i) =>
          `${i + 1}. ${leg.matchDescription} | ${leg.prediction} @ ${Number(leg.odds || 0).toFixed(3)}${
            leg.matchDate ? ` | ${new Date(leg.matchDate).toISOString()}` : ''
          }`,
      )
      .join('\n');
    const text = `New pick from ${data.tipsterName}\n${
      data.tipsterForm
        ? `\n${data.tipsterForm}${asOfLabel ? `\nAs of: ${asOfLabel}` : ''}\nStats source: settled pick results on BetRollover.\nPerformance can change as new picks settle.\n`
        : '\n'
    }\n${couponUserFacingRef(data.accumulatorId, data.couponTitle)}\nAccess: ${accessLabel}\nPrice: ${priceLabel}\nTotal Odds: ${totalOddsLabel}\n\n${textLegs}\n\nOpen: ${ctaUrl}\n\n— BetRollover`;

    const subTitle = truncateCouponTitleForSubject(data.couponTitle || '', 45);
    const subject = subTitle
      ? `${data.tipsterName} posted: ${subTitle}`
      : `${data.tipsterName} posted a new pick`;

    const result = await this.send({
      to,
      subject,
      text,
      html,
    });
    if (!result.sent) {
      this.logger.warn(`sendCouponCardEmail: send failed for ${to}: ${result.error || 'unknown'}`);
      throw new Error(result.error || 'Pick alert email was not sent');
    }
    return result;
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

    if ('type' in data && data.type in ADMIN_NOTIFICATION_TEMPLATES) {
      const tpl = ADMIN_NOTIFICATION_TEMPLATES[data.type as AdminNotificationType];
      const ctx = data.metadata as Record<string, unknown>;
      subject = tpl.subject(ctx as never);
      message = tpl.message(ctx as never);
      link = tpl.link;
      ctaText = tpl.ctaText;
    } else if ('subject' in data && 'message' in data) {
      subject = data.subject;
      message = data.message;
      link = data.link || '/admin';
      ctaText = 'View in Admin';
    } else {
      return { sent: 0 };
    }

    const ctaUrl = link.startsWith('http') ? link : `${this.appOrigin()}${link}`;
    const safeMessage = this.escapeEmailText(message || '').replace(/\n/g, '<br>');
    const safeSubject = this.escapeEmailText(subject);

    const inner = `${this.brandHeader('Admin', safeSubject)}
${this.bodyCell(`${this.copyP(safeMessage)}${this.ctaButton(ctaUrl, ctaText)}`)}`;

    const html = this.premiumDocument(inner, 'System message — not sent to users.');

    let sent = 0;
    for (const to of recipients) {
      const result = await this.send({ to, subject, text: message, html });
      if (result.sent) sent++;
    }
    return { sent };
  }
}
