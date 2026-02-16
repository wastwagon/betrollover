# BetRollover Notification Types

All platform notifications use **SendGrid** for email delivery. In-app notifications are stored in the `notifications` table; emails are sent when `sendEmail: true` and the user has `emailNotifications` enabled.

## Platform behavior

- **Picks are auto-approved** when tipsters create them. No admin approval.
- **Tipsters are auto-approved** when they request tipster status (email verified).
- **ROI restriction**: Tipsters must reach minimum ROI (admin settings, default 20%) from free picks before they can set prices. When ROI falls below minimum, they can only post free picks.
- **Minimum ROI** is configurable in Admin → Settings.

## Activity → Notification Mapping

| Activity | Notification Type | Recipient | Email | Trigger Location |
|----------|-------------------|-----------|-------|------------------|
| Tipster creates pick (marketplace) | `pick_published` | Tipster | ✓ | `AccumulatorsService.create()` |
| User purchases pick | `purchase` | Buyer | ✓ | `AccumulatorsService.purchase()` |
| Someone buys your coupon | `coupon_sold` | Tipster (seller) | ✓ | `AccumulatorsService.purchase()` |
| User follows tipster | `new_follower` | Tipster | ✓ | `TipsterFollowService.follow()` |
| Tipster moves into top 10 | `leaderboard_rank_up` | Tipster | ✓ | `ResultTrackerService.updateLeaderboardRankings()` |
| Pick settles (buyer wins) | `settlement` | Buyer | ✓ | `SettlementService.settleEscrow()` |
| Pick settles (buyer loses) | `settlement` | Buyer | ✓ | `SettlementService.settleEscrow()` |
| Pick settles (seller) | `settlement` | Seller | ✓ | `SettlementService.settleEscrow()` |
| ROI falls below minimum | `roi_below_minimum` | Tipster | ✓ | `SettlementService.settleEscrow()` |
| Deposit completed | `deposit_success` | User | ✓ | `WalletService.verifyDepositByRef()`, `handlePaystackWebhook()` |
| Withdrawal completed | `withdrawal_done` | Tipster | ✓ | `WalletService.requestWithdrawal()` |
| Withdrawal failed | `withdrawal_failed` | Tipster | ✓ | `WalletService.requestWithdrawal()` (catch) |
| User registers | (auth) | User | ✓ | `AuthService.register()` – verification email |
| Resend verification | (auth) | User | ✓ | `AuthService.resendVerificationEmail()` |

## Notification Type Config

Defined in `backend/src/modules/notifications/notification-types.config.ts`:

- `pick_published` – Pick posted to marketplace (auto-approved)
- `purchase` – Pick purchased
- `coupon_sold` – Someone bought your coupon (tipster)
- `new_follower` – Someone started following you (tipster)
- `leaderboard_rank_up` – Moved into top 10 on leaderboard (tipster)
- `settlement` – Pick settled (won/lost/refund)
- `roi_below_minimum` – Tipster ROI fell below minimum; can only post free picks
- `deposit_success` – Wallet deposit credited
- `withdrawal_done` – Withdrawal completed
- `withdrawal_failed` – Withdrawal failed (refunded)
- `system_announcement` – Platform announcements

## Email Templates

All notification emails use professional HTML templates:

### Notification emails (`sendNotificationEmail`)
- **Category-based accent colors**: marketplace (green), wallet (blue), account (purple), social (pink), achievement (amber), system (gray)
- **Contextual subject lines** from `notification-types.config` (e.g. "Purchase confirmed: Pick Title", "Deposit of GHS 50 received")
- **Type-specific CTA buttons**: "View Marketplace", "View My Purchases", "View Wallet", etc.
- **Header banner** with BetRollover branding and notification title
- **Footer** with manage preferences note

### Auth emails
- **Registration OTP**: Centered card layout, large code display, expiry notice
- **Email verification**: Button CTA, link fallback, 24h expiry note

## Admin Emails

Admins (users with `role=admin`) receive email notifications for:

| Activity | Subject | Message | CTA | Trigger |
|----------|---------|---------|-----|---------|
| Withdrawal requested | `Withdrawal request: GHS X from [Name]` | [Name] (email) has requested a withdrawal of GHS X. The transfer is being processed via Paystack. | View Withdrawals | `WalletService.requestWithdrawal()` |
| Deposit completed | `Deposit completed: GHS X from [Name]` | [Name] (email) has deposited GHS X. Funds have been credited to their wallet. | View Deposits | `WalletService.verifyDepositByRef()`, `handlePaystackWebhook()` |
| New user registered | `New user registered: [Name]` | [Name] (email) has signed up as @username. They have been auto-approved as a tipster. | View Users | `AuthService.register()` |
| New coupon posted | `New coupon: "[Title]" by [Tipster]` | [Tipster] has posted "[Title]" at GHS X / (free pick) to the marketplace. | View Marketplace | `AccumulatorsService.create()` (marketplace) |

**Templates:** Defined in `backend/src/modules/email/admin-notification-templates.config.ts`. Each type has subject template, message template, CTA text, link, and accent color (withdrawal=gray, deposit=blue, user=purple, coupon=green).

**HTML:** Professional template with BetRollover Admin header, type-specific accent color, message body, and CTA button. Sent via `EmailService.sendAdminNotification()` to all admin users.

## User Preferences

- `users.emailNotifications` – Global email toggle (default: true)
- Future: `user_notification_preferences` table for per-type control (see `create_notifications_system.sql`)
