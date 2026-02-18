import {
  getEmailSubject,
  getCtaText,
  getCategoryColor,
  getNotificationTypeConfig,
} from './notification-types.config';

describe('notification-types.config', () => {
  describe('getEmailSubject', () => {
    it('should return contextual subject for purchase', () => {
      expect(getEmailSubject('purchase', 'Purchase Complete', { pickTitle: 'My Pick' }))
        .toBe('Purchase confirmed: My Pick');
    });

    it('should return fallback for unknown type', () => {
      expect(getEmailSubject('unknown', 'Default Title')).toBe('Default Title');
    });
  });

  describe('getCtaText', () => {
    it('should return cta text for known type', () => {
      expect(getCtaText('new_follower')).toBe('View Tipsters');
      expect(getCtaText('purchase')).toBe('View My Purchases');
    });

    it('should return default for unknown type', () => {
      expect(getCtaText('unknown')).toBe('View details');
    });
  });

  describe('getCategoryColor', () => {
    it('should return color for known type (via category)', () => {
      expect(getCategoryColor('purchase')).toBe('#10b981'); // marketplace category
      expect(getCategoryColor('deposit_success')).toBe('#3b82f6'); // wallet category
    });
  });

  describe('getNotificationTypeConfig', () => {
    it('should return config for known type', () => {
      const config = getNotificationTypeConfig('coupon_sold');
      expect(config).toBeDefined();
      expect(config?.ctaText).toBe('View Marketplace');
    });

    it('should return undefined for unknown type', () => {
      expect(getNotificationTypeConfig('unknown')).toBeUndefined();
    });
  });
});
