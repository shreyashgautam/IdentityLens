export interface AuthUser {
  id: string;
  email: string;
  role: 'viewer' | 'admin';
  emailVerified: boolean;
  provider: string;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

