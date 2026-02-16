# BetRollover v1 → v2 Feature Reference

This document maps features from the original BetRollover (PHP) to the new stack for implementation.

## Original Location: `../BetRolloverApp`

---

## Core Features

### 1. Authentication
| v1 | v2 Status |
|----|-----------|
| `login.php`, `register.php` | ✅ Implemented (NestJS auth module) |
| Session-based | JWT (stateless, mobile-friendly) |
| `AuthMiddleware.php` | JwtAuthGuard |

### 2. Users
| v1 | v2 Status |
|----|-----------|
| `users` table | ✅ User entity (TypeORM) |
| Roles: user, tipster, admin | ✅ UserRole enum |
| `profile.php` | Pending |

### 3. Picks & Marketplace
| v1 | v2 Status |
|----|-----------|
| `picks`, `pick_selections`, `pick_marketplace` | Pending |
| `PickMarketplace.php` | Pending |
| `create_pick.php`, `pick_management.php` | Pending |
| `marketplace.php`, `pick_marketplace.php` | Pending |

### 4. Accumulators
| v1 | v2 Status |
|----|-----------|
| `accumulator_tickets`, `accumulator_picks` | Pending |
| `AccumulatorCalculator.php`, `AccumulatorSettlement.php` | Pending |
| `accumulator.php` | Pending |

### 5. Wallet & Payments
| v1 | v2 Status |
|----|-----------|
| `user_wallets`, `wallet_transactions` | ✅ Schema + Wallet module (balance endpoint) |
| `PaystackService.php` | Pending |
| `paystack_webhook.php` | Pending (critical for production) |

### 6. Escrow
| v1 | v2 Status |
|----|-----------|
| `escrow_funds`, `escrow_transactions` | ✅ Schema created |
| `EscrowManager.php` | Pending |

### 7. Chat
| v1 | v2 Status |
|----|-----------|
| `chat_messages`, `chat_reactions` | Pending |
| `ChatManager.php` | Pending |
| Polling (2s interval) | WebSocket or Pusher recommended |

### 8. Notifications
| v1 | v2 Status |
|----|-----------|
| `notifications`, `notification_reads` | Pending |
| `NotificationService.php` | Pending |
| `get_notifications.php` | Pending |

### 9. Social
| v1 | v2 Status |
|----|-----------|
| `user_follows`, `pick_likes`, `pick_comments` | Pending |
| `SocialFeatures.php` | Pending |

### 10. Admin
| v1 | v2 Status |
|----|-----------|
| `admin_*.php` controllers | Pending |
| Admin layout, dashboard | Pending |

---

## Database Tables (50+)

Key tables to map in TypeORM:

- `users` ✅
- `accumulator_tickets`, `accumulator_picks` ✅ (schema)
- `user_wallets`, `wallet_transactions` ✅ (schema + API)
- `escrow_funds`, `escrow_transactions` ✅ (schema)
- `pick_marketplace`, `user_purchased_picks`, `notifications` ✅ (schema)
- `chat_messages`
- `notifications`
- `countries`, `teams`, `national_teams`
- `contests`, `contest_entries`
- `support_tickets`
- `referral_codes`, `referral_tracking`

---

## Config Reference (v1)

From `config/config.php`:

- `commissions.tipster_rate`: 70%
- `commissions.platform_rate`: 30%
- `currency`: GHS
- `country`: Ghana
- `timezone`: Africa/Accra
- Paystack keys (use env vars in v2)
