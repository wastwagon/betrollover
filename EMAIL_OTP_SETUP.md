# Email OTP for Registration

Registration uses **email-based OTP** to verify users and reduce fake signups. Users enter their email, receive a 6-digit code via email, and must verify before completing registration.

## Flow

1. User enters email on the register page.
2. User clicks **Send verification code** → backend generates and stores a 6-digit OTP, sends it via SendGrid.
3. User receives email with the code (valid for 10 minutes).
4. User enters the code and completes the form (username, display name, password).
5. On submit, backend verifies OTP against the stored value before creating the user.
6. User is created with `email_verified_at` set (no separate verification link needed).
7. User is auto-approved as tipster and can start sharing coupons immediately.

## Email Configuration

SendGrid or SMTP must be configured (see main docs). The same email service used for other notifications sends the OTP.

- `SENDGRID_API_KEY` – preferred for production
- Or `SMTP_*` settings

## Database

Migration `035_registration_email_otp.sql` creates the `registration_otps` table. OTPs are stored here and deleted after use or expiry. Migrations run automatically on API startup.

## API

- `POST /auth/otp/send` – body: `{ "email": "user@example.com" }`
- `POST /auth/register` – body: `{ "email", "username", "displayName", "password", "confirmPassword", "otpCode" }`

## Rate Limits

- 5 OTP requests per 15 minutes per IP
- 5 registrations per hour per IP
