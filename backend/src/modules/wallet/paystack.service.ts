import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaystackSettings } from './entities/paystack-settings.entity';
import { normalizeGhanaMomoPhone, toPaystackMomoBankCode } from './ghana-momo';
import { mapPaystackClientError, pickPaystackSecret } from './paystack-keys';

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(
    private config: ConfigService,
    @InjectRepository(PaystackSettings)
    private paystackSettingsRepo: Repository<PaystackSettings>,
  ) {}

  private async resolveSecret() {
    const settings = await this.paystackSettingsRepo.findOne({ where: { id: 1 } });
    return {
      settings,
      ...pickPaystackSecret({
        dbKey: settings?.secretKey,
        envKey: this.config.get<string>('PAYSTACK_SECRET_KEY'),
        mode: settings?.mode,
      }),
    };
  }

  private async getSecretKey(): Promise<string> {
    return (await this.resolveSecret()).key;
  }

  async isConfigured(): Promise<boolean> {
    return (await this.resolveSecret()).kind !== 'invalid';
  }

  /** Instant MoMo payouts. Off by default — Starter Paystack accounts cannot send Transfers. */
  async isTransfersEnabled(): Promise<boolean> {
    const settings = await this.paystackSettingsRepo.findOne({ where: { id: 1 } });
    return settings?.transfersEnabled === true;
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
      const picked = await this.resolveSecret();
      this.logger.warn(
        `Paystack initialize failed (${res.status}) kind=${picked.kind} source=${picked.source}: ${data.message || 'unknown'}`,
      );
      throw new BadRequestException(mapPaystackClientError(data.message));
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
    const { createHmac } = await import('crypto');
    const hash = createHmac('sha512', secretKey).update(payload).digest('hex');
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
      const bankCode = toPaystackMomoBankCode(params.bankCode || params.provider || '');
      const accountNumber =
        normalizeGhanaMomoPhone(params.accountNumber || params.phone || '') ||
        (params.accountNumber || params.phone || '').replace(/\D/g, '');
      if (!bankCode || !accountNumber) {
        throw new BadRequestException('Valid Ghana Mobile Money number and network are required');
      }
      // Paystack MoMo recipients use account_number + bank_code (MTN | VOD | ATL), not phone/provider.
      body.account_number = accountNumber;
      body.bank_code = bankCode;
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
      throw new BadRequestException(mapPaystackClientError(data.message, 'Failed to create payout recipient'));
    }
    return data.data;
  }

  async verifyTransfer(reference: string): Promise<{
    status?: string;
    transfer_code?: string;
    reference?: string;
    amount?: number;
  } | null> {
    if (!(await this.isConfigured())) return null;
    const secretKey = await this.getSecretKey();
    const res = await fetch(`${this.baseUrl}/transfer/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const data = await res.json();
    return data.status ? data.data : null;
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
      throw new BadRequestException(mapPaystackClientError(data.message, 'Transfer failed'));
    }
    return data.data;
  }
}
