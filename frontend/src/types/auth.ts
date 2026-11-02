export interface AuthUser {
  id: string;
  email: string;
  role: 'viewer' | 'admin';
  emailVerified: boolean;
  provider: string;
  organization?: string;
  displayName?: string;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface MfaChallenge {
  mfaRequired: boolean;
  mfaToken: string;
  email: string;
  maskedEmail: string;
  expiresIn: number;
}


