import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaystackSettings } from './entities/paystack-settings.entity';

@Injectable()
export class PaystackService {
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(
    private config: ConfigService,
    @InjectRepository(PaystackSettings)
    private paystackSettingsRepo: Repository<PaystackSettings>,
  ) {}

  private async getSecretKey(): Promise<string> {
    const settings = await this.paystackSettingsRepo.findOne({ where: { id: 1 } });
    const dbKey = settings?.secretKey?.trim();
    if (dbKey && dbKey.startsWith('sk_')) return dbKey;
    return this.config.get<string>('PAYSTACK_SECRET_KEY') || '';
  }

  async isConfigured(): Promise<boolean> {
    const key = await this.getSecretKey();
    return !!key && key.startsWith('sk_');
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
    if (!(await this.isConfigured())) {
      throw new BadRequestException('Paystack is not configured. Add keys in Admin Settings or PAYSTACK_SECRET_KEY in .env');
    }
    const secretKey = await this.getSecretKey();
    // Paystack GHS: amount in pesewas (1 GHS = 100 pesewas)
    const amountInPesewas = Math.round(params.amount * 100);
    if (amountInPesewas < 100) {
      throw new BadRequestException('Minimum deposit is GHS 1.00');
    }

    const res = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secretKey}`,
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
    if (!(await this.isConfigured())) return null;
    const secretKey = await this.getSecretKey();
    const res = await fetch(`${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const data = await res.json();
    return data.status ? data.data : null;
  }

  async verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
    const secretKey = await this.getSecretKey();
    if (!secretKey) return false;
    const crypto = require('crypto');
    const hash = crypto.createHmac('sha512', secretKey).update(payload).digest('hex');
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
    if (!(await this.isConfigured())) {
      throw new BadRequestException('Paystack is not configured');
    }
    const secretKey = await this.getSecretKey();
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
        Authorization: `Bearer ${secretKey}`,
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
    if (!(await this.isConfigured())) {
      throw new BadRequestException('Paystack is not configured');
    }
    const secretKey = await this.getSecretKey();
    const amountInPesewas = Math.round(params.amount * 100);
    if (amountInPesewas < 100) {
      throw new BadRequestException('Minimum transfer is GHS 1.00');
    }

    const res = await fetch(`${this.baseUrl}/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secretKey}`,
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
