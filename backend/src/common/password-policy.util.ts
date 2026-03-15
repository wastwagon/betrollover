/**
 * Password policy for registration and password change/reset.
 * Enforces minimum length and basic complexity (letter + number).
 */

const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

export function validatePasswordPolicy(password: string): { valid: true } | { valid: false; message: string } {
  if (typeof password !== 'string') {
    return { valid: false, message: 'Password must be a string.' };
  }
  const p = password.trim();
  if (p.length < MIN_LENGTH) {
    return { valid: false, message: `Password must be at least ${MIN_LENGTH} characters.` };
  }
  if (p.length > MAX_LENGTH) {
    return { valid: false, message: `Password must be at most ${MAX_LENGTH} characters.` };
  }
  if (!/[a-zA-Z]/.test(p)) {
    return { valid: false, message: 'Password must contain at least one letter.' };
  }
  if (!/[0-9]/.test(p)) {
    return { valid: false, message: 'Password must contain at least one number.' };
  }
  return { valid: true };
}
