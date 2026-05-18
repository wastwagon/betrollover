import {
  resolveNotificationPreferenceGroup,
  isNotificationPreferenceGroup,
} from './notification-preference-groups';

describe('notification-preference-groups', () => {
  it('maps pick_comment types to social', () => {
    expect(resolveNotificationPreferenceGroup('pick_comment_reply')).toBe('social');
  });

  it('maps purchase to marketplace', () => {
    expect(resolveNotificationPreferenceGroup('purchase')).toBe('marketplace');
  });

  it('maps withdrawal variants to wallet', () => {
    expect(resolveNotificationPreferenceGroup('withdrawal_failed')).toBe('wallet');
  });

  it('validates group keys', () => {
    expect(isNotificationPreferenceGroup('social')).toBe(true);
    expect(isNotificationPreferenceGroup('invalid')).toBe(false);
  });
});
