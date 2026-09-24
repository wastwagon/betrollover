/**
 * Auth API request/response shapes (shared contract).
 */

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  referralCode?: string;
}

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  displayName: string;
  role: string;
  emailVerifiedAt?: string | null;
}

export interface AuthResponse {
  access_token: string;
  user: AuthUser;
}
