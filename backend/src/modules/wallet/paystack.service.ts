import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaystackService {
  private readonly secretKey: string;
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(private config: ConfigService) {
    this.secretKey = this.config.get<string>('PAYSTACK_SECRET_KEY') || '';
  }

  isConfigured(): boolean {
    return !!this.secretKey && this.secretKey.startsWith('sk_');
  }

  generateReference(prefix = 'DEP'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  async initializeTransaction(params: {
    email: string;
    amount: number;
    reference: string;
    callbackUrl?: string;
    metadata?: Record<string, unknown>;
  }) {
    if (!this.isConfigured()) {
      throw new BadRequestException('Paystack is not configured. Add PAYSTACK_SECRET_KEY to .env');
    }
    // Paystack GHS: amount in pesewas (1 GHS = 100 pesewas)
    const amountInPesewas = Math.round(params.amount * 100);
    if (amountInPesewas < 100) {
      throw new BadRequestException('Minimum deposit is GHS 1.00');
    }

    const res = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.secretKey}`,
      },
      body: JSON.stringify({
        email: params.email,
        amount: amountInPesewas,
        reference: params.reference,
        currency: 'GHS',
        callback_url: params.callbackUrl,
        metadata: params.metadata,
      }),
    });

    const data = await res.json();
    if (!data.status) {
      throw new BadRequestException(data.message || 'Paystack initialization failed');
    }
    return data.data;
  }

  async verifyTransaction(reference: string) {
    if (!this.isConfigured()) return null;
    const res = await fetch(`${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${this.secretKey}` },
    });
    const data = await res.json();
    return data.status ? data.data : null;
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const crypto = require('crypto');
    const hash = crypto.createHmac('sha512', this.secretKey).update(payload).digest('hex');
    return hash === signature;
  }

  generateTransferReference(): string {
    return `WDR_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`.toLowerCase();
  }

  async createTransferRecipient(params: {
    type: 'mobile_money' | 'ghipss';
    name: string;
    accountNumber?: string;
    bankCode?: string;
    currency?: string;
    phone?: string;
    provider?: string;
  }) {
    if (!this.isConfigured()) {
      throw new BadRequestException('Paystack is not configured');
    }
    const body: Record<string, unknown> = {
      type: params.type,
      name: params.name,
      currency: params.currency || 'GHS',
    };
    if (params.type === 'ghipss') {
      body.account_number = params.accountNumber;
      body.bank_code = params.bankCode;
    } else {
      body.phone = params.phone;
      body.provider = params.provider;
    }

    const res = await fetch(`${this.baseUrl}/transferrecipient`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.secretKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!data.status) {
      throw new BadRequestException(data.message || 'Failed to create payout recipient');
    }
    return data.data;
  }

  async initiateTransfer(params: {
    amount: number;
    recipient: string;
    reference: string;
    reason?: string;
  }) {
    if (!this.isConfigured()) {
      throw new BadRequestException('Paystack is not configured');
    }
    const amountInPesewas = Math.round(params.amount * 100);
    if (amountInPesewas < 100) {
      throw new BadRequestException('Minimum transfer is GHS 1.00');
    }

    const res = await fetch(`${this.baseUrl}/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.secretKey}`,
      },
      body: JSON.stringify({
        source: 'balance',
        amount: amountInPesewas,
        recipient: params.recipient,
        reference: params.reference,
        reason: params.reason || 'Withdrawal',
        currency: 'GHS',
      }),
    });

    const data = await res.json();
    if (!data.status) {
      throw new BadRequestException(data.message || 'Transfer failed');
    }
    return data.data;
  }
}
