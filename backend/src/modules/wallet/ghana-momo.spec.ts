import {
  isPaystackRecipientCode,
  isPaystackTransfersUnavailableMessage,
  normalizeGhanaMomoPhone,
  toPaystackMomoBankCode,
} from './ghana-momo';

describe('ghana-momo', () => {
  describe('toPaystackMomoBankCode', () => {
    it('maps UI and Paystack telco codes to MTN/VOD/ATL', () => {
      expect(toPaystackMomoBankCode('mtn_gh')).toBe('MTN');
      expect(toPaystackMomoBankCode('MTN')).toBe('MTN');
      expect(toPaystackMomoBankCode('vodafone_gh')).toBe('VOD');
      expect(toPaystackMomoBankCode('Telecel')).toBe('VOD');
      expect(toPaystackMomoBankCode('airteltigo_gh')).toBe('ATL');
    });

    it('returns null for unknown networks', () => {
      expect(toPaystackMomoBankCode('paypal')).toBeNull();
      expect(toPaystackMomoBankCode('')).toBeNull();
    });
  });

  describe('normalizeGhanaMomoPhone', () => {
    it('keeps local 10-digit numbers', () => {
      expect(normalizeGhanaMomoPhone('0551234987')).toBe('0551234987');
      expect(normalizeGhanaMomoPhone('055 123 4987')).toBe('0551234987');
    });

    it('converts 233 country code to local format', () => {
      expect(normalizeGhanaMomoPhone('233551234987')).toBe('0551234987');
    });

    it('rejects invalid lengths', () => {
      expect(normalizeGhanaMomoPhone('05512')).toBeNull();
      expect(normalizeGhanaMomoPhone('')).toBeNull();
    });
  });

  describe('isPaystackRecipientCode', () => {
    it('detects Paystack recipient codes', () => {
      expect(isPaystackRecipientCode('RCP_u2tnoyjjvh95pzm')).toBe(true);
      expect(isPaystackRecipientCode('manual_123')).toBe(false);
    });
  });

  describe('isPaystackTransfersUnavailableMessage', () => {
    it('matches Starter / transfers-disabled errors', () => {
      expect(isPaystackTransfersUnavailableMessage('You cannot initiate third party payouts as a starter business')).toBe(true);
      expect(isPaystackTransfersUnavailableMessage('Invalid phone number')).toBe(false);
    });
  });
});
